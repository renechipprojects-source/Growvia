import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

interface ImportIssue {
  file: string;
  line: number;
  identifier: string;
  kind: string;
}

function runComprehensiveImportsAudit() {
  console.log("=== COMPREHENSIVE IMPORT AUDIT ACROSS ALL ADMIN ROUTES AND COMPONENTS ===");

  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "frontend", "src");

  const issues: ImportIssue[] = [];

  const commonGlobalIdentifiers = new Set([
    "console", "window", "document", "Math", "Date", "Object", "Array", "String", "Number", "Boolean",
    "JSON", "Promise", "Error", "RegExp", "Map", "Set", "parseInt", "parseFloat", "encodeURI",
    "decodeURI", "encodeURIComponent", "decodeURIComponent", "isNaN", "isFinite", "setTimeout",
    "clearTimeout", "setInterval", "clearInterval", "fetch", "alert", "confirm", "prompt", "process",
    "undefined", "null", "NaN", "Infinity", "globalThis", "ReactNode", "JSX", "HTMLInputElement", "HTMLButtonElement", "HTMLDivElement", "FormEvent", "KeyboardEvent", "MouseEvent", "ChangeEvent"
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

    const declaredOrImported = new Set<string>();

    function visitDeclarations(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (clause) {
          if (clause.name) declaredOrImported.add(clause.name.text);
          if (clause.namedBindings) {
            if (ts.isNamedImports(clause.namedBindings)) {
              clause.namedBindings.elements.forEach((el) => {
                declaredOrImported.add(el.name.text);
              });
            } else if (ts.isNamespaceImport(clause.namedBindings)) {
              declaredOrImported.add(clause.namedBindings.name.text);
            }
          }
        }
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        declaredOrImported.add(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            declaredOrImported.add(decl.name.text);
          }
        });
      } else if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        declaredOrImported.add(node.name.text);
      } else if (ts.isForOfStatement(node) || ts.isForInStatement(node)) {
        if (ts.isVariableDeclarationList(node.initializer)) {
          node.initializer.declarations.forEach((decl) => {
            if (ts.isIdentifier(decl.name)) declaredOrImported.add(decl.name.text);
          });
        }
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        // Handle dynamic import().then(({ foo }) => ...)
        const parent = node.parent;
        if (parent && ts.isPropertyAccessExpression(parent) && parent.name.text === "then") {
          const grandParent = parent.parent;
          if (grandParent && ts.isCallExpression(grandParent) && grandParent.arguments.length > 0) {
            const callback = grandParent.arguments[0];
            if (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) {
              const param = callback.parameters[0];
              if (param && ts.isObjectBindingPattern(param.name)) {
                param.name.elements.forEach((el) => {
                  if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) {
                    declaredOrImported.add(el.name.text);
                  }
                });
              }
            }
          }
        }
      }
      ts.forEachChild(node, visitDeclarations);
    }

    visitDeclarations(sourceFile);

    const hooksAndUtilsToCheck = [
      "useEffect", "useState", "useMemo", "useCallback", "useRef", "useContext", "useId",
      "cn", "toast", "toCanonicalAdmissionNo", "generateCanonicalAdmissionNo", "fetchStudents",
      "fetchTeachers", "fetchFees", "fetchExpenses", "fetchInventory", "fetchCirculars"
    ];

    function visitCode(node: ts.Node) {
      if (ts.isIdentifier(node)) {
        const text = node.text;
        if (hooksAndUtilsToCheck.includes(text)) {
          const parent = node.parent;
          const isPropertyAccess = parent && ts.isPropertyAccessExpression(parent) && parent.name === node && ts.isIdentifier(parent.expression) && (parent.expression.text === "React" || parent.expression.text === "props");
          const isObjectProperty = parent && (ts.isPropertyAssignment(parent) || ts.isShorthandPropertyAssignment(parent)) && parent.name === node;
          const isImportSpecifier = parent && (ts.isImportSpecifier(parent) || ts.isImportClause(parent));
          const isParameter = parent && ts.isParameter(parent);

          if (!declaredOrImported.has(text) && !isPropertyAccess && !isObjectProperty && !isImportSpecifier && !isParameter) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            issues.push({
              file: relPath,
              line: line + 1,
              identifier: text,
              kind: "UNDEFINED_IDENTIFIER_REFERENCE",
            });
          }
        }
      }
      ts.forEachChild(node, visitCode);
    }

    visitCode(sourceFile);
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

  console.log(`\nFound ${issues.length} missing identifier issues across frontend/src:`);
  issues.forEach((iss, idx) => {
    console.log(`${idx + 1}. ${iss.file}:${iss.line} -> ReferenceError: "${iss.identifier}" is not imported!`);
  });

  if (issues.length > 0) {
    throw new Error(`FAIL: ${issues.length} undefined identifier reference errors detected!`);
  } else {
    console.log("  [PASS] Zero missing identifier or hook import errors across all frontend files.");
  }
}

runComprehensiveImportsAudit();
