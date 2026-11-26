import { realpathSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { parseSync } from "oxc-parser";
import { analyze } from "periscopic";
import { walk } from "estree-walker";
import MagicString from "magic-string";
import { isImplOutput, isLegacySpecifier } from "./options.js";

export function transform(code, id, options) {
   if (isImplOutput(id)) {
      if (options.devThrows === false) return stripDevThrows(code, id);
      else if (options.devThrows === true) return null;
   }
   const manifest = options.manifest;
   if (!manifest?.methods?.length) throw new Error("protopp transform requires a manifest");
   const legacy = new Set(manifest.legacy ?? []);
   const byName = new Map(manifest.methods.map((method) => [method.name, method]));
   const prefilter = new RegExp(`\\b(?:${manifest.methods.map((method) => method.name).sort((a, b) => b.length - a.length).join("|")})\\b`);
   if (!prefilter.test(code) && !code.includes("@marthvon/protopp") && !(options.stripBareImports && /^\s*import\s+['"]\./m.test(code)))
      return null;

   const parsed = parseSync(id, code, { sourceType: "module", lang: langOf(id) });
   if (parsed.errors?.length) {
      const message = `${id}: ${formatParseError(parsed.errors[0])}`;
      if (/\.(?:svelte|vue)$/.test(id.split("?")[0])) return { code: null, map: null, errors: [], warnings: [message] };
      return { code: null, map: null, errors: [message], warnings: [] };
   }

   const ast = parsed.program;
   walk(ast, {
      enter(node, parent) {
         Object.defineProperty(node, "parent", { value: parent, enumerable: false, configurable: true });
      },
   });

   let scopeMap = null;
   let moduleScope = null;
   try {
      const analyzed = analyze(ast);
      scopeMap = analyzed.map;
      moduleScope = analyzed.scope;
   } catch (error) {
      return { code: null, map: null, errors: [`${id}: scope analysis failed: ${error.message}`], warnings: [] };
   }

   const context = { code, id, options, byName, legacy, scopeMap, moduleScope, used: new Map(), opt: null, optCall: null, declared: collectDeclared(ast) };
   const roots = [];
   walk(ast, {
      enter(node) {
         const info = rewriteRoot(node, context);
         if (info) roots.push(info);
      },
   });
   const rootNodes = new Set(roots.map((info) => info.node));
   const outermost = roots.filter((info) => {
      let parent = info.node.parent;
      while (parent) {
         if (rootNodes.has(parent)) return false;
         parent = parent.parent;
      }
      return true;
   });
   const contains = new Set();
   for (const info of outermost) {
      let parent = info.node;
      while (parent) {
         contains.add(parent);
         parent = parent.parent;
      }
   }

   const errors = [];
   const seen = new Set();
   walk(ast, {
      enter(node) {
         const problem = unboundProblem(node, context);
         if (!problem || seen.has(problem.start)) return;
         seen.add(problem.start);
         errors.push(problem.message);
      },
   });

   const removals = [];
   for (const node of ast.body) {
      if (node.type !== "ImportDeclaration") continue;
      const source = node.source.value;
      const bare = node.specifiers.length === 0;
      if (!options.legacy && bare && isLegacySpecifier(source, legacy)) removals.push(node);
      else if (options.stripBareImports && bare && source.startsWith(".")) removals.push(node);
   }

   if (!outermost.length && !removals.length) {
      if (!errors.length) return null;
      return { code: null, map: null, errors, warnings: [] };
   }

   const magic = new MagicString(code);
   for (const node of removals) magic.remove(node.start, node.end);
   for (const info of outermost) magic.overwrite(info.node.start, info.node.end, emitCall(info, context, contains));
   const imports = importLines(context);
   if (imports) {
      const at = code.startsWith("#!") ? code.indexOf("\n") + 1 : 0;
      magic.appendLeft(at, `${imports}\n`);
   }
   return {
      code: magic.toString(),
      map: magic.generateMap({ hires: true, source: id, includeContent: true }),
      errors,
      warnings: [],
   };

   function render(node) {
      const info = rewriteRoot(node, context);
      if (info) return emitCall(info, context, contains);
      if (!contains.has(node)) return code.slice(node.start, node.end);
      const children = directChildren(node);
      let out = "";
      let cursor = node.start;
      for (const child of children) {
         if (child.start < cursor || child.end > node.end) continue;
         out += code.slice(cursor, child.start);
         out += render(child);
         cursor = child.end;
      }
      return out + code.slice(cursor, node.end);
   }

   function emitCall(info, ctx, marked) {
      const local = binding(info.entry, ctx);
      const args = info.args.map((arg) => render(arg)).join(", ");
      if (info.kind === "global") return args ? `${local}(${args})` : `${local}()`;
      if (info.kind === "static") {
         if (ctx.options.dispatch === "trusted" && info.entry.impl) {
            const list = args ? `${info.entry.owner}, ${args}` : info.entry.owner;
            return `${local}.call(${list})`;
         }
         return args ? `${local}(${args})` : `${local}()`;
      }
      const receiver = render(info.object);
      const trustedDirect = ctx.options.dispatch === "trusted" && info.entry.impl;
      if (info.optionalReceiver) {
         const opt = trustedDirect ? optBinding(ctx, "optCall") : optBinding(ctx, "opt");
         return args ? `${opt}(${receiver}, ${local}, ${args})` : `${opt}(${receiver}, ${local})`;
      }
      if (trustedDirect) return args ? `${local}.call(${receiver}, ${args})` : `${local}.call(${receiver})`;
      return args ? `${local}(${receiver}, ${args})` : `${local}(${receiver})`;
   }
}

function rewriteRoot(node, context) {
   if (node.type === "ChainExpression" && node.expression?.type === "CallExpression") {
      const info = describeCall(node.expression, context);
      if (!info) return null;
      return { node, ...info };
   }
   if (node.type === "CallExpression" && node.parent?.type !== "ChainExpression") {
      const info = describeCall(node, context);
      if (!info) return null;
      return { node, ...info };
   }
   return null;
}

function describeCall(call, context) {
   let callee = call.callee;
   if (callee.type === "ChainExpression") callee = callee.expression;
   if (callee.type === "Identifier") {
      const entry = context.byName.get(callee.name);
      if (!entry || entry.kind !== "global" || shadowed(callee, callee.name, context)) return null;
      return { kind: "global", entry, args: call.arguments };
   }
   if (callee.type !== "MemberExpression" || callee.object?.type === "Super") return null;
   const name = memberName(callee);
   if (!name) return null;
   const entry = context.byName.get(name);
   if (!entry) return null;
   if (entry.kind === "static") {
      if (callee.object.type !== "Identifier" || callee.object.name !== entry.owner || shadowed(callee.object, entry.owner, context))
         return null;
      return { kind: "static", entry, args: call.arguments };
   }
   if (entry.kind !== "prototype") return null;
   return {
      kind: "prototype",
      entry,
      args: call.arguments,
      object: callee.object,
      optionalReceiver: callee.optional === true || mayBeNull(callee.object),
   };
}

function unboundProblem(node, context) {
   if (node.type === "Identifier") return unboundGlobal(node, context);
   if (node.type !== "MemberExpression") return null;
   const name = memberName(node);
   if (!name || node.object?.type === "Super") return null;
   const entry = context.byName.get(name);
   if (!entry) return null;
   if (entry.kind === "static") {
      if (node.object.type !== "Identifier" || node.object.name !== entry.owner || shadowed(node.object, entry.owner, context))
         return null;
   } else if (entry.kind !== "prototype") return null;
   if (isCalled(node) || isWrite(node) || isNew(node)) return null;
   const where = location(context.code, context.id, node.start);
   return {
      start: node.start,
      message: `${where} protopp cannot compile ${name} because it is not called. Use (...args) => receiver.${name}(...args).`,
   };
}

function unboundGlobal(node, context) {
   const entry = context.byName.get(node.name);
   if (!entry || entry.kind !== "global" || isMemberProperty(node) || isDeclarationId(node) || shadowed(node, node.name, context))
      return null;
   const parent = node.parent;
   if (parent?.type === "CallExpression" && parent.callee === node) return null;
   if (parent?.type === "ChainExpression" && parent.expression === node && parent.parent?.type === "CallExpression" && parent.parent.callee === parent)
      return null;
   const where = location(context.code, context.id, node.start);
   return {
      start: node.start,
      message: `${where} protopp cannot compile ${node.name} because it is not called. Use (...args) => ${node.name}(...args).`,
   };
}

function binding(entry, context) {
   const trustedDirect = context.options.dispatch === "trusted" && entry.impl;
   const key = `${entry.name}:${trustedDirect ? "impl" : "helper"}`;
   const existing = context.used.get(key);
   if (existing) return existing.local;
   const local = freeName(`__pp_${entry.name}`, context);
   context.used.set(key, { entry, local, trustedDirect });
   return local;
}

function optBinding(context, which) {
   if (context[which]) return context[which];
   const local = freeName(which === "opt" ? "__pp_opt" : "__pp_optCall", context);
   context[which] = local;
   return local;
}

function freeName(base, context) {
   let name = base;
   let index = 1;
   while (context.declared.has(name) || [...context.used.values()].some((item) => item.local === name) || context.opt === name || context.optCall === name) {
      name = `${base}${index}`;
      index += 1;
   }
   context.declared.add(name);
   return name;
}

function importLines(context) {
   const lines = [];
   if (context.opt) lines.push(`import { opt as ${context.opt} } from "${specifier("runtime/opt.js", context)}";`);
   if (context.optCall) lines.push(`import { optCall as ${context.optCall} } from "${specifier("runtime/opt.js", context)}";`);
   for (const item of context.used.values()) {
      const rel = item.trustedDirect ? item.entry.impl : item.entry.helper;
      lines.push(`import { ${item.entry.name} as ${item.local} } from "${specifier(rel, context)}";`);
   }
   return lines.join("\n");
}

function specifier(rel, context) {
   if (!context.options.fromFile) return `@marthvon/protopp/${rel}`;
   const abs = realpathSync(join(context.options.root, "min", rel));
   let out = relative(realpathSync(dirname(context.options.fromFile)), abs);
   if (!out.startsWith(".")) out = `./${out}`;
   return out.split(sep).join("/");
}

function shadowed(node, name, context) {
   let current = node;
   while (current) {
      const scope = context.scopeMap.get(current);
      if (scope) return scope.has(name);
      current = current.parent;
   }
   return context.moduleScope.has(name);
}

function mayBeNull(node) {
   if (!node) return false;
   if (node.type === "ChainExpression" || node.optional) return true;
   if (node.type === "MemberExpression") return node.optional === true || mayBeNull(node.object);
   if (node.type === "CallExpression") return node.optional === true || mayBeNull(node.callee);
   if (node.type === "ParenthesizedExpression" || node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression" || node.type === "TSTypeAssertion")
      return mayBeNull(node.expression);
   return false;
}

function memberName(member) {
   if (!member.computed) return member.property?.type === "Identifier" ? member.property.name : null;
   if (member.property?.type === "Literal" && typeof member.property.value === "string") return member.property.value;
   return null;
}

function isCalled(member) {
   const parent = member.parent;
   if (parent?.type === "CallExpression" && parent.callee === member) return true;
   if (parent?.type === "ChainExpression" && parent.expression === member && parent.parent?.type === "CallExpression" && parent.parent.callee === parent)
      return true;
   return false;
}

function isNew(member) {
   const parent = member.parent?.type === "ChainExpression" ? member.parent.parent : member.parent;
   const target = member.parent?.type === "ChainExpression" ? member.parent : member;
   return parent?.type === "NewExpression" && parent.callee === target;
}

function isWrite(member) {
   const parent = member.parent?.type === "ChainExpression" ? member.parent.parent : member.parent;
   const target = member.parent?.type === "ChainExpression" ? member.parent : member;
   if (!parent) return false;
   if (parent.type === "AssignmentExpression" && parent.left === target) return true;
   if (parent.type === "UpdateExpression" && parent.argument === target) return true;
   if ((parent.type === "ForInStatement" || parent.type === "ForOfStatement") && parent.left === target) return true;
   if (parent.type === "UnaryExpression" && parent.operator === "delete" && parent.argument === target) return true;
   return false;
}

function isMemberProperty(node) {
   return node.parent?.type === "MemberExpression" && node.parent.property === node && !node.parent.computed;
}

function isDeclarationId(node) {
   const parent = node.parent;
   if (!parent) return false;
   if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression" || parent.type === "ClassDeclaration") && parent.id === node)
      return true;
   if (parent.type === "VariableDeclarator" && containsBinding(parent.id, node)) return true;
   if (parent.type === "ImportSpecifier" || parent.type === "ImportDefaultSpecifier" || parent.type === "ImportNamespaceSpecifier") return true;
   if (parent.type === "CatchClause" && parent.param && containsBinding(parent.param, node)) return true;
   if (parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression" || parent.type === "ArrowFunctionExpression") {
      for (const param of parent.params ?? []) if (containsBinding(param, node)) return true;
   }
   if ((parent.type === "Property" || parent.type === "MethodDefinition" || parent.type === "PropertyDefinition") && parent.key === node && !parent.computed && parent.value !== node)
      return true;
   if (parent.type === "RestElement" || parent.type === "AssignmentPattern" || parent.type === "ArrayPattern" || parent.type === "ObjectPattern")
      return containsBinding(parent, node);
   return false;
}

function containsBinding(pattern, node) {
   if (pattern === node) return true;
   if (!pattern || pattern.type === "Identifier") return false;
   if (pattern.type === "AssignmentPattern") return containsBinding(pattern.left, node);
   if (pattern.type === "RestElement") return containsBinding(pattern.argument, node);
   if (pattern.type === "ArrayPattern") return pattern.elements.some((element) => element && containsBinding(element, node));
   if (pattern.type === "ObjectPattern") return pattern.properties.some((prop) => prop.type === "RestElement" ? containsBinding(prop, node) : containsBinding(prop.value, node));
   return false;
}

function collectDeclared(ast) {
   const names = new Set();
   walk(ast, {
      enter(node, parent) {
         if (node.type !== "Identifier") return;
         if (!Object.hasOwn(node, "parent"))
         Object.defineProperty(node, "parent", { value: parent, enumerable: false, configurable: true });
         if (isDeclarationId(node)) names.add(node.name);
      },
   });
   return names;
}

function directChildren(node) {
   const children = [];
   for (const key of Object.keys(node)) {
      if (key === "parent" || key === "start" || key === "end" || key === "loc" || key === "range") continue;
      const value = node[key];
      if (Array.isArray(value)) {
         for (const item of value) if (isNode(item)) children.push(item);
      } else if (isNode(value)) children.push(value);
   }
   children.sort((a, b) => a.start - b.start || b.end - a.end);
   const direct = [];
   for (const child of children) {
      if (direct.some((kept) => child !== kept && child.start >= kept.start && child.end <= kept.end)) continue;
      direct.push(child);
   }
   direct.sort((a, b) => a.start - b.start);
   return direct;
}

function isNode(value) {
   return !!value && typeof value === "object" && typeof value.type === "string" && typeof value.start === "number" && typeof value.end === "number";
}

function stripDevThrows(code, id) {
   const parsed = parseSync(id, code, { sourceType: "module", lang: "js" });
   if (parsed.errors?.length)
      return { code: null, map: null, errors: [`${id}: ${formatParseError(parsed.errors[0])}`], warnings: [] };
   const comments = (parsed.comments ?? []).filter((comment) => comment.type === "Block").sort((a, b) => a.start - b.start);
   const ranges = [];
   let open = null;
   for (const comment of comments) {
      const label = comment.value.trim();
      if (label === "DEV START") {
         if (open) return { code: null, map: null, errors: [`${id}: DEV START is still open at ${comment.start}`], warnings: [] };
         else open = comment;
      } else if (label === "DEV END") {
         if (!open) return { code: null, map: null, errors: [`${id}: DEV END has no DEV START at ${comment.start}`], warnings: [] };
         else {
            ranges.push([open.start, comment.end]);
            open = null;
         }
      }
   }
   if (open) return { code: null, map: null, errors: [`${id}: DEV START at ${open.start} has no DEV END`], warnings: [] };
   else if (!ranges.length) return null;
   const magic = new MagicString(code);
   for (const [start, end] of ranges) magic.remove(start, end);
   return {
      code: magic.toString(),
      map: magic.generateMap({ hires: true, source: id, includeContent: true }),
      errors: [],
      warnings: [],
   };
}

function langOf(id) {
   const file = id.split("?")[0];
   if (file.endsWith(".tsx")) return "tsx";
   if (file.endsWith(".jsx")) return "jsx";
   if (/\.(?:[cm]?ts)$/.test(file)) return "ts";
   return "js";
}

function formatParseError(error) {
   if (typeof error === "string") return error;
   return error?.message ?? JSON.stringify(error);
}

function location(code, id, index) {
   const head = code.slice(0, index);
   const line = head.split("\n").length;
   const column = index - head.lastIndexOf("\n");
   return `${id}:${line}:${column}`;
}
