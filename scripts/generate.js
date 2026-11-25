import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseSync } from "oxc-parser";
import MagicString from "magic-string";
import { walk } from "estree-walker";
import { GUARD_MESSAGE } from "../plugin/core/options.js";

const TARGET_RANK = ["Array.prototype", "String.prototype", "Number.prototype", "Function.prototype", "Error.prototype", "Object.prototype"];
const FOLDERS = {
   "Array.prototype": "array",
   "Array": "array",
   "String.prototype": "string",
   "Number.prototype": "number",
   "Function.prototype": "function",
   "Function": "function",
   "Error.prototype": "error",
   "Object.prototype": "object",
   "Math": "math",
   "global": "global",
};

export function generate(root) {
   const srcDir = join(root, "src");
   const minDir = join(root, "min");
   rmSync(minDir, { recursive: true, force: true });
   rmSync(join(root, "types", "runtime"), { recursive: true, force: true });
   mkdirSync(minDir, { recursive: true });

   const files = walkJs(srcDir);
   const methods = [];
   const legacy = [];
   for (const file of files) {
      const rel = relative(srcDir, file).split(sep).join("/");
      const code = readFileSync(file, "utf8");
      const ast = parse(rel, code);
      linkParents(ast);
      let found = methodInstalls(ast, code);
      if (found.renamed) {
         const again = parse(rel, found.code);
         linkParents(again);
         found = methodInstalls(again, found.code);
      }
      writeClassified(root, rel, found, legacy, methods);
   }

   for (const file of walkJs(minDir)) {
      const fixed = ensureExtensions(readFileSync(file, "utf8"), dirname(file));
      if (fixed) writeFileSync(file, fixed);
   }

   const manifest = manifestOf(methods, legacy);
   writeHelpers(minDir, manifest.methods);
   writeFileSync(join(minDir, "guard.js"), `if (process.env.NODE_ENV === "production") {\n   throw new Error(${JSON.stringify(GUARD_MESSAGE)});\n}\n`);
   writeFileSync(join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
   checkTypes(join(root, "types", "global.d.ts"), manifest.methods);
   return manifest;
}

function writeClassified(root, rel, found, legacy, methods) {
   const minDir = join(root, "min");
   if (found.methods.length) {
      write(join(minDir, "_impl", rel), cleanupImpl(found.impl));
      write(join(minDir, rel), legacySource(rel, found.methods, bareImportTexts(found.ast, found.original)));
      legacy.push(rel);
      for (const method of found.methods) methods.push({ ...method, impl: `_impl/${rel}` });
      return;
   }
   if (isBarrel(found.ast)) {
      write(join(minDir, rel), legacyBarrel(rel, bareImportTexts(found.ast, found.original)));
      legacy.push(rel);
      return;
   }
   write(join(minDir, rel), found.original);
   write(join(minDir, "_impl", rel), found.original);
}

function methodInstalls(ast, code) {
   const installs = [];
   walk(ast, {
      enter(node) {
         const method = asInstall(node, code);
         if (method) installs.push(method);
      },
   });
   const collisions = new Set();
   for (const install of installs) {
      for (const statement of ast.body) {
         if (statement.type === "FunctionDeclaration" && statement.id?.name === install.method.name) collisions.add(install.method.name);
      }
   }
   if (collisions.size) {
      const magic = new MagicString(code);
      walk(ast, {
         enter(node) {
            if (node.type === "Identifier" && collisions.has(node.name) && shouldRename(node))
               magic.overwrite(node.start, node.end, `${node.name}$local`);
         },
      });
      return { renamed: true, code: magic.toString() };
   }
   if (!installs.length) return { renamed: false, impl: code, original: code, ast, methods: [] };
   const grouped = groupInstalls(installs, code);
   return { renamed: false, impl: grouped.source, original: code, ast, methods: grouped.methods };
}

function groupInstalls(installs, code) {
   const groups = new Map();
   for (const install of installs) {
      const span = install.span;
      const key = `${span.start}:${span.end}`;
      if (!groups.has(key)) groups.set(key, { span, installs: [] });
      groups.get(key).installs.push(install);
   }
   const methods = [];
   const magic = new MagicString(code);
   for (const group of groups.values()) {
      const branched = branchOf(group, code);
      if (branched) {
         methods.push(branched.method);
         magic.overwrite(group.span.start, group.span.end, branched.text);
      } else {
         const texts = [];
         for (const install of group.installs) {
            methods.push(install.method);
            texts.push(exportText(install.method, code));
         }
         magic.overwrite(group.span.start, group.span.end, texts.join("\n\n"));
      }
   }
   return { source: magic.toString(), methods };
}

function asInstall(node, code) {
   if (node.type !== "CallExpression") return null;
   const called = calleeName(node.callee);
   if (called !== "defineProperty" && called !== "defineGlobalFunc") return null;
   if (called === "defineGlobalFunc") return globalInstall(node, code);
   if (calleeName(node.callee) === "defineProperty" && node.callee.type === "MemberExpression" && node.callee.object?.name === "Object")
      return propertyInstall(node, code);
   return null;
}

function propertyInstall(node, code) {
   const [targetNode, nameNode, descriptor] = node.arguments;
   if (nameNode?.type !== "Literal" || typeof nameNode.value !== "string" || descriptor?.type !== "ObjectExpression")
      throw new Error(`unsupported defineProperty near ${node.start}`);
   const target = memberPath(targetNode);
   if (!target) throw new Error(`unsupported defineProperty target near ${node.start}`);
   let fn = null;
   const flags = {};
   for (const prop of descriptor.properties) {
      if (prop.type !== "Property" || prop.computed) continue;
      const key = prop.key.name ?? prop.key.value;
      if (key === "value") fn = prop.value;
      else if (prop.value.type === "Literal") flags[key] = prop.value.value;
   }
   if (!fn || (fn.type !== "FunctionExpression" && fn.type !== "ArrowFunctionExpression"))
      throw new Error(`defineProperty ${target}.${nameNode.value} has no function`);
   const method = methodRecord(nameNode.value, target, fn, flags, code);
   return { method, fn, span: spanFor(node, method) };
}

function globalInstall(node, code) {
   const [nameNode, fn] = node.arguments;
   if (nameNode?.type !== "Literal" || typeof nameNode.value !== "string" || !fn)
      throw new Error(`unsupported defineGlobalFunc near ${node.start}`);
   const method = methodRecord(nameNode.value, "global", fn, {}, code);
   let span = node;
   while (span && span.type !== "ExpressionStatement") span = span.parent;
   return { method, fn, span };
}

function methodRecord(name, target, fn, flags, code) {
   const params = paramInfo(fn, code);
   const kind = target === "global" ? "global" : target.endsWith(".prototype") ? "prototype" : "static";
   const owner = kind === "static" ? target : null;
   return { name, target, kind, owner, flags, params, fn };
}

function spanFor(call, method) {
   let node = call;
   while (node && node.type !== "ExpressionStatement") node = node.parent;
   let guard = null;
   let cursor = node;
   while (cursor) {
      const parent = cursor.parent;
      if (parent?.type === "BlockStatement" && parent.body.length === 1) {
         cursor = parent;
         continue;
      }
      if (parent?.type === "IfStatement" && parent.consequent === cursor && isGuard(parent.test, method.target, method.name)) {
         guard = parent;
         break;
      }
      if (parent?.type === "IfStatement" && (parent.consequent === cursor || parent.alternate === cursor)) {
         cursor = parent;
         continue;
      }
      break;
   }
   return guard ?? node;
}

function branchOf(group, code) {
   if (group.installs.length !== 2 || group.installs[0].method.name !== group.installs[1].method.name) return null;
   let inner = null;
   walk(group.span, {
      enter(node) {
         if (!inner && node.type === "IfStatement" && node.alternate) inner = node;
      },
   });
   if (!inner) return null;
   const consequent = group.installs.find((install) => install.fn.start >= inner.consequent.start && install.fn.end <= inner.consequent.end);
   const alternate = group.installs.find((install) => install.fn.start >= inner.alternate.start && install.fn.end <= inner.alternate.end);
   if (!consequent || !alternate) return null;
   const method = consequent.method;
   const text = `export function ${method.name}(${method.params.text}) {\n   const fn = (${code.slice(inner.test.start, inner.test.end)})\n      ? ${code.slice(consequent.fn.start, consequent.fn.end)}\n      : ${code.slice(alternate.fn.start, alternate.fn.end)};\n   return fn.apply(this, arguments);\n}`;
   return { method, text };
}

function exportText(method, code) {
   const source = method.implSource ?? code;
   const fn = method.fn;
   if (fn.type === "ArrowFunctionExpression") return `export const ${method.name} = ${source.slice(fn.start, fn.end)};`;
   const async = fn.async ? "async " : "";
   const star = fn.generator ? "*" : "";
   const body = source.slice(fn.body.start, fn.body.end);
   return `export ${async}function${star} ${method.name}(${method.params.text}) ${body}`;
}

function cleanupImpl(code) {
   const ast = parse("impl.js", code);
   linkParents(ast);
   const magic = new MagicString(code);
   for (const node of ast.body) {
      if (node.type !== "ImportDeclaration") continue;
      if (node.specifiers.length === 0 && node.source.value.startsWith(".")) {
         magic.remove(node.start, node.end);
         continue;
      }
      const unused = node.specifiers.filter((spec) => occurrences(code, spec.local.name) === 1);
      if (unused.length === node.specifiers.length) magic.remove(node.start, node.end);
      else {
         for (const spec of unused) {
            const next = code[spec.end] === "," ? spec.end + 1 : spec.end;
            magic.remove(spec.start, next);
         }
      }
   }
   return magic.toString();
}

function bareImportTexts(ast, code) {
   return ast.body
      .filter((node) => node.type === "ImportDeclaration" && node.specifiers.length === 0)
      .map((node) => code.slice(node.start, node.end));
}

function legacySource(rel, methods, bareImports) {
   const lines = [`import ${JSON.stringify(relTo(rel, "guard.js"))};`];
   const implPath = relTo(rel, `_impl/${rel}`);
   lines.push(`import { ${methods.map((method) => method.name).join(", ")} } from ${JSON.stringify(implPath)};`);
   const globals = methods.filter((method) => method.kind === "global");
   if (globals.length) {
      lines.push(`import { defineGlobalFunc } from ${JSON.stringify(relTo(rel, "_impl/utilitypp/helper.js"))};`);
      for (const method of globals) lines.push(`defineGlobalFunc(${JSON.stringify(method.name)}, ${method.name});`);
   }
   for (const method of methods) {
      if (method.kind === "global") continue;
      lines.push(`if (!${method.target}.${method.name})`);
      lines.push(`   Object.defineProperty(${method.target}, ${JSON.stringify(method.name)}, ${descriptor(method)});`);
   }
   lines.push(...bareImports);
   return lines.join("\n");
}

function legacyBarrel(rel, bareImports) {
   return [`import ${JSON.stringify(relTo(rel, "guard.js"))};`, ...bareImports].join("\n");
}

function descriptor(method) {
   const parts = [`value: ${method.name}`];
   for (const key of ["writable", "enumerable", "configurable"]) {
      if (Object.prototype.hasOwnProperty.call(method.flags, key)) parts.push(`${key}: ${method.flags[key]}`);
   }
   return `{ ${parts.join(", ")} }`;
}

function manifestOf(methods, legacy) {
   const byName = new Map();
   for (const method of methods) {
      if (!byName.has(method.name)) byName.set(method.name, []);
      byName.get(method.name).push(method);
   }
   const entries = [];
   for (const [name, list] of byName) {
      const kinds = new Set(list.map((method) => method.kind));
      if (kinds.size !== 1) throw new Error(`${name} is installed as ${[...kinds].join(" and ")}`);
      const kind = list[0].kind;
      const folder = list.length > 1 ? "shared" : FOLDERS[list[0].target];
      if (!folder) throw new Error(`no runtime folder for ${name} on ${list[0].target}`);
      const same = list.every((method) => method.params.text === list[0].params.text && method.params.rest === list[0].params.rest);
      entries.push({
         name,
         kind,
         owner: kind === "static" ? list[0].owner : null,
         targets: list.map((method) => method.target),
         helper: `runtime/${folder}/${name}.js`,
         impl: list.length === 1 ? list[0].impl : null,
         impls: list.map((method) => ({ target: method.target, impl: method.impl, params: method.params })),
         params: same ? list[0].params : { text: "...args", rest: true, named: [], restName: "args" },
         rest: same ? list[0].params.rest : true,
      });
   }
   entries.sort((a, b) => a.name.localeCompare(b.name));
   return { methods: entries, legacy: [...new Set(legacy)].sort() };
}

function writeHelpers(minDir, methods) {
   write(join(minDir, "runtime", "opt.js"), [
      "export function opt(receiver, fn, ...args) {",
      "   if (receiver == null) return undefined;",
      "   return fn(receiver, ...args);",
      "}",
      "",
      "export function optCall(receiver, fn, ...args) {",
      "   if (receiver == null) return undefined;",
      "   return fn.call(receiver, ...args);",
      "}",
   ].join("\n"));
   write(join(minDir, "..", "types", "runtime", "opt.d.ts"), [
      "export function opt(receiver: any, fn: Function, ...args: any[]): any;",
      "export function optCall(receiver: any, fn: Function, ...args: any[]): any;",
   ].join("\n"));
   for (const method of methods) {
      const file = join(minDir, method.helper);
      write(file, method.kind === "prototype" ? prototypeHelper(method) : directHelper(method));
      write(join(minDir, "..", "types", method.helper.replace(/\.js$/, ".d.ts")), `export function ${method.name}(...args: any[]): any;\n`);
   }
}

function prototypeHelper(method) {
   const impls = method.impls.slice().sort((a, b) => TARGET_RANK.indexOf(a.target) - TARGET_RANK.indexOf(b.target));
   const params = method.params;
   const signature = params.rest && params.named.length === 0
      ? `receiver, ...${params.restName}`
      : params.text ? `receiver, ${params.text}` : "receiver";
   const lines = impls.map((impl, index) => `import { ${method.name} as impl${index} } from ${JSON.stringify(relTo(method.helper, impl.impl))};`);
   lines.push("");
   lines.push(`export function ${method.name}(${signature}) {`);
   lines.push(`   const own = receiver.${method.name};`);
   const skips = impls.map((impl) => `own !== ${impl.target}.${method.name}`).join(" && ");
   lines.push(`   if (own !== undefined && ${skips}) return ${invoke("own", params)};`);
   impls.forEach((impl, index) => {
      lines.push(`   if (${typeTest(impl.target)}) return ${invoke(`impl${index}`, params)};`);
   });
   lines.push(`   if (own !== undefined) return ${invoke("own", params)};`);
   lines.push(`   throw new TypeError(${JSON.stringify(`receiver.${method.name} is not a function`)});`);
   lines.push("}");
   return lines.join("\n");
}

function directHelper(method) {
   if (method.kind === "global")
      return `export { ${method.name} } from ${JSON.stringify(relTo(method.helper, method.impl))};`;
   const params = method.params;
   return [
      `import { ${method.name} as impl } from ${JSON.stringify(relTo(method.helper, method.impl))};`,
      "",
      `export function ${method.name}(${params.text}) {`,
      `   return ${staticCall(method, params)};`,
      "}",
   ].join("\n");
}

function staticCall(method, params) {
   if (params.rest && params.named.length === 0) return `impl.apply(${method.owner}, ${params.restName})`;
   if (params.rest) return `impl.call(${method.owner}, ${params.named.join(", ")}, ...${params.restName})`;
   if (!params.named.length) return `impl.call(${method.owner})`;
   return `impl.call(${method.owner}, ${params.named.join(", ")})`;
}

function invoke(callee, params) {
   if (params.rest && params.named.length === 0) return `${callee}.apply(receiver, ${params.restName})`;
   if (params.rest) return `${callee}.call(receiver, ${params.named.join(", ")}, ...${params.restName})`;
   if (!params.named.length) return `${callee}.call(receiver)`;
   return `${callee}.call(receiver, ${params.named.join(", ")})`;
}

function typeTest(target) {
   if (target === "Array.prototype") return "Array.isArray(receiver)";
   if (target === "String.prototype") return `(typeof receiver === "string" || receiver instanceof String)`;
   if (target === "Number.prototype") return `(typeof receiver === "number" || receiver instanceof Number)`;
   if (target === "Function.prototype") return `typeof receiver === "function"`;
   if (target === "Error.prototype") return "receiver instanceof Error";
   if (target === "Object.prototype") return "(receiver !== null && receiver !== undefined)";
   throw new Error(`no type test for ${target}`);
}

function checkTypes(file, methods) {
   const text = readFileSync(file, "utf8");
   const missing = methods.filter((method) => !new RegExp(`\\b${method.name}\\b`).test(text)).map((method) => method.name);
   if (missing.length) throw new Error(`types/global.d.ts is missing ${missing.join(", ")}`);
}

function paramInfo(fn, code) {
   const params = fn.params ?? [];
   const named = [];
   let restName = null;
   for (const param of params) {
      if (param.type === "RestElement") restName = param.argument.type === "Identifier" ? param.argument.name : "args";
      else if (param.type === "Identifier") named.push(param.name);
      else if (param.type === "AssignmentPattern" && param.left.type === "Identifier") named.push(param.left.name);
   }
   return {
      text: params.length ? code.slice(params[0].start, params[params.length - 1].end) : "",
      rest: restName != null,
      named,
      restName,
   };
}

function ensureExtensions(code, fromDir) {
   let ast;
   try {
      ast = parse("ext.js", code);
   } catch {
      return null;
   }
   const magic = new MagicString(code);
   let changed = false;
   walk(ast, {
      enter(node) {
         if (node.type !== "ImportDeclaration" || typeof node.source?.value !== "string") return;
         const source = node.source.value;
         if (!source.startsWith(".") || /\.[A-Za-z0-9]+$/.test(source)) return;
         if (!existsSync(`${resolve(fromDir, source)}.js`)) return;
         magic.overwrite(node.source.start, node.source.end, JSON.stringify(`${source}.js`));
         changed = true;
      },
   });
   return changed ? magic.toString() : null;
}

function isBarrel(ast) {
   return ast.body.length > 0 && ast.body.every((node) => node.type === "ImportDeclaration");
}

function isGuard(test, target, name) {
   return test?.type === "UnaryExpression" && test.operator === "!" && memberPath(test.argument) === `${target}.${name}`;
}

function memberPath(node) {
   if (!node) return null;
   if (node.type === "Identifier") return node.name;
   if (node.type === "MemberExpression" && !node.computed && node.property?.type === "Identifier") {
      const object = memberPath(node.object);
      return object ? `${object}.${node.property.name}` : null;
   }
   return null;
}

function calleeName(callee) {
   if (callee?.type === "Identifier") return callee.name;
   if (callee?.type === "MemberExpression" && !callee.computed && callee.property?.type === "Identifier") return callee.property.name;
   return null;
}

function shouldRename(node) {
   const parent = node.parent;
   if (parent?.type === "MemberExpression" && parent.property === node && !parent.computed) return false;
   if ((parent?.type === "Property" || parent?.type === "MethodDefinition") && parent.key === node && !parent.computed && !parent.shorthand)
      return false;
   return true;
}

function occurrences(code, name) {
   return code.match(new RegExp(`\\b${name}\\b`, "g"))?.length ?? 0;
}

function linkParents(ast) {
   walk(ast, {
      enter(node, parent) {
         Object.defineProperty(node, "parent", { value: parent, enumerable: false, configurable: true });
      },
   });
}

function parse(file, code) {
   const result = parseSync(file, code, { sourceType: "module", lang: "js" });
   if (result.errors?.length) throw new Error(`${file}: ${result.errors[0].message ?? JSON.stringify(result.errors[0])}`);
   return result.program;
}

function relTo(fromRel, toRel) {
   let rel = relative(dirname(fromRel), toRel).split(sep).join("/");
   if (!rel.startsWith(".")) rel = `./${rel}`;
   return rel;
}

function walkJs(dir) {
   if (!existsSync(dir)) return [];
   const files = [];
   for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walkJs(full));
      else if (entry.name.endsWith(".js")) files.push(full);
   }
   return files;
}

function write(file, text) {
   mkdirSync(dirname(file), { recursive: true });
   writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
}
