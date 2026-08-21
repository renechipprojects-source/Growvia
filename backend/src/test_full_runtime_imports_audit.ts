import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

interface ComponentRenderIssue {
  file: string;
  line: number;
  identifier: string;
  kind: string;
  context: string;
}

function runFullComponentRenderValidityAudit() {
  console.log("=== COMPREHENSIVE APPLICATION-WIDE COMPONENT RENDER VALIDITY AUDIT ===");

  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "frontend", "src");

  const issues: ComponentRenderIssue[] = [];

  const standardHtmlTags = new Set([
    "a", "abbr", "address", "area", "article", "aside", "audio", "b", "base", "bdi", "bdo",
    "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup",
    "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed",
    "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
    "head", "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins", "kbd", "label",
    "legend", "li", "link", "main", "map", "mark", "menu", "meta", "meter", "nav", "noscript",
    "object", "ol", "optgroup", "option", "output", "p", "param", "picture", "pre", "progress",
    "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "small", "source", "span",
    "strong", "style", "sub", "summary", "sup", "svg", "table", "tbody", "td", "template", "textarea",
    "tfoot", "th", "thead", "time", "title", "tr", "track", "u", "ul", "var", "video", "wbr",
    "circle", "path", "g", "line", "polyline", "polygon", "rect", "defs", "use"
  ]);

  const globalScopeIdentifiers = new Set([
    "console", "window", "document", "Math", "Date", "Object", "Array", "String", "Number", "Boolean",
    "JSON", "Promise", "Error", "RegExp", "Map", "Set", "parseInt", "parseFloat", "encodeURI",
    "decodeURI", "encodeURIComponent", "decodeURIComponent", "isNaN", "isFinite", "setTimeout",
    "clearTimeout", "setInterval", "clearInterval", "fetch", "alert", "confirm", "prompt", "process",
    "undefined", "null", "NaN", "Infinity", "globalThis", "ReactNode", "JSX", "HTMLInputElement",
    "HTMLButtonElement", "HTMLDivElement", "FormEvent", "KeyboardEvent", "MouseEvent", "ChangeEvent",
    "React", "props", "children", "this", "super", "arguments", "eval"
  ]);

  function checkFile(filePath: string) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relPath = path.relative(rootDir, filePath);

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const fileDeclaredOrImported = new Set<string>(globalScopeIdentifiers);

    // Collect file-level imports and top-level declarations
    function visitTopDeclarations(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (clause) {
          if (clause.name) fileDeclaredOrImported.add(clause.name.text);
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              clause.namedBindings.elements.forEach((el) => {
                fileDeclaredOrImported.add(el.name.text);
              });
            } else if (ts.isNamespaceImport(clause.namedBindings)) {
              fileDeclaredOrImported.add(clause.namedBindings.name.text);
            }
          }
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        fileDeclaredOrImported.add(node.name.text);
      } else if (ts.isVariableStatement(node) && node.parent === sourceFile) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            fileDeclaredOrImported.add(decl.name.text);
          }
        });
      } else if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        fileDeclaredOrImported.add(node.name.text);
      }
      ts.forEachChild(node, visitTopDeclarations);
    }

    visitTopDeclarations(sourceFile);

    // Helper to extract declared names inside a function component scope
    function collectFunctionScopeIdentifiers(funcNode: ts.Node): Set<string> {
      const scopeSet = new Set<string>(fileDeclaredOrImported);

      function visitInner(node: ts.Node) {
        if (ts.isVariableDeclaration(node)) {
          if (ts.isIdentifier(node.name)) {
            scopeSet.add(node.name.text);
          } else if (ts.isArrayBindingPattern(node.name) || ts.isObjectBindingPattern(node.name)) {
            node.name.elements.forEach((el) => {
              if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) {
                scopeSet.add(el.name.text);
              }
            });
          }
        } else if (ts.isFunctionDeclaration(node) && node.name) {
          scopeSet.add(node.name.text);
        } else if (ts.isParameter(node)) {
          if (ts.isIdentifier(node.name)) {
            scopeSet.add(node.name.text);
          } else if (ts.isObjectBindingPattern(node.name)) {
            node.name.elements.forEach((el) => {
              if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) {
                scopeSet.add(el.name.text);
              }
            });
          }
        } else if (ts.isForOfStatement(node) || ts.isForInStatement(node)) {
          if (ts.isVariableDeclarationList(node.initializer)) {
            node.initializer.declarations.forEach((decl) => {
              if (ts.isIdentifier(decl.name)) scopeSet.add(decl.name.text);
            });
          }
        }
        ts.forEachChild(node, visitInner);
      }

      visitInner(funcNode);
      return scopeSet;
    }

    // Traverse AST nodes checking JSX elements, JSX expression attributes, and Hooks against the active scope
    function checkNodeScope(node: ts.Node, currentScope: Set<string>) {
      let activeScope = currentScope;

      if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
        activeScope = collectFunctionScopeIdentifiers(node);
      }

      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const tagName = node.tagName;
        if (ts.isIdentifier(tagName)) {
          const name = tagName.text;
          if (/^[A-Z]/.test(name) && !standardHtmlTags.has(name)) {
            if (!activeScope.has(name)) {
              const { line } = sourceFile.getLineAndCharacterOfPosition(tagName.getStart());
              issues.push({
                file: relPath,
                line: line + 1,
                identifier: name,
                kind: "UNDEFINED_JSX_COMPONENT_OR_ICON",
                context: `<${name} /> used in JSX without import declaration`,
              });
            }
          }
        }
      }

      // Check JSX Expression attributes (e.g. onClick={handleCreateNew})
      if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        const expr = node.initializer.expression;
        if (ts.isIdentifier(expr)) {
          const text = expr.text;
          if (!activeScope.has(text)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(expr.getStart());
            issues.push({
              file: relPath,
              line: line + 1,
              identifier: text,
              kind: "UNDEFINED_EVENT_HANDLER_OR_IDENTIFIER",
              context: `JSX Attribute ${node.name.text}={${text}} references undefined handler "${text}"`,
            });
          }
        }
      }

      // Check React Hooks
      if (ts.isIdentifier(node)) {
        const text = node.text;
        if (text.startsWith("use") && text.length > 3 && /^[A-Z]/.test(text[3])) {
          const parent = node.parent;
          const isPropertyAccess = parent && ts.isPropertyAccessExpression(parent) && parent.name === node;
          const isImportSpecifier = parent && (ts.isImportSpecifier(parent) || ts.isImportClause(parent));
          const isParameter = parent && ts.isParameter(parent);

          if (!activeScope.has(text) && !isPropertyAccess && !isImportSpecifier && !isParameter) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            issues.push({
              file: relPath,
              line: line + 1,
              identifier: text,
              kind: "UNDEFINED_REACT_HOOK",
              context: `Hook ${text} invoked without import declaration`,
            });
          }
        }
      }

      ts.forEachChild(node, (child) => checkNodeScope(child, activeScope));
    }

    checkNodeScope(sourceFile, fileDeclaredOrImported);
  }

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
        scanDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
        checkFile(fullPath);
      }
    }
  }

  scanDir(srcDir);

  console.log(`\nFound ${issues.length} Component Render & Import issues across frontend/src:`);
  issues.forEach((iss, idx) => {
    console.log(`${idx + 1}. [${iss.kind}] ${iss.file}:${iss.line} -> ReferenceError: "${iss.identifier}" is not imported or defined! (${iss.context})`);
  });

  if (issues.length > 0) {
    throw new Error(`FAIL: ${issues.length} undefined JSX components, icons, handlers, or hook reference errors detected!`);
  } else {
    console.log("  [PASS] Zero missing JSX components, icons, handlers, or hook import errors across all frontend files.");
  }
}

runFullComponentRenderValidityAudit();
