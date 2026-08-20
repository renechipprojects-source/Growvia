import * as fs from "fs";
import * as path from "path";

interface NavigationIssue {
  sourceFile: string;
  destinationRoute: string;
  issueType: string;
  details: string;
}

function runForensicNavigationSuite() {
  console.log("=== STARTING FORENSIC APPLICATION-WIDE NAVIGATION AUDIT ===");

  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, "frontend", "src");
  const routesDir = path.join(srcDir, "routes");

  // 1. Discover all route files in frontend/src/routes
  const registeredRoutes = new Set<string>();
  const routeFileMap = new Map<string, string>();

  function scanRouteFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanRouteFiles(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const match = content.match(/createFileRoute\(\s*["']([^"']+)["']\s*\)/);
        if (match) {
          const routePath = match[1];
          registeredRoutes.add(routePath);
          routeFileMap.set(routePath, path.relative(rootDir, fullPath));
        }
      }
    }
  }

  scanRouteFiles(routesDir);

  console.log(`\n[STEP 1] Discovered ${registeredRoutes.size} registered routes in frontend/src/routes:`);
  Array.from(registeredRoutes).sort().forEach((r) => {
    console.log(`  - ${r} (${routeFileMap.get(r)})`);
  });

  // 2. Scan all tsx/ts files for Link to="..." and navigate({ to: "..." })
  const issues: NavigationIssue[] = [];
  let totalLinksChecked = 0;

  function scanForLinks(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
        scanForLinks(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const relPath = path.relative(rootDir, fullPath);

        // Match <Link to="..." />, <QuickLink to="..." />, to: "...", url: "..."
        const linkToRegex = /(?:to|url|href)\s*[:=]\s*["']([^"']+)["']/g;
        let match;
        while ((match = linkToRegex.exec(content)) !== null) {
          const dest = match[1];
          // Skip external URLs, hash links, static assets, or data URIs
          if (dest.startsWith("http") || dest.startsWith("mailto") || dest.startsWith("tel") || dest.startsWith("#") || dest === "data:") continue;
          if (/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/i.test(dest)) continue;
          if (!dest.startsWith("/")) continue;

          totalLinksChecked++;

          // Strip query params or hash from destination
          const cleanDest = dest.split("?")[0].split("#")[0];
          
          // Check if cleanDest exists in registeredRoutes or is an exact match / parent route
          const isRegistered = registeredRoutes.has(cleanDest) ||
            registeredRoutes.has(cleanDest + "/") ||
            (cleanDest.endsWith("/") && registeredRoutes.has(cleanDest.slice(0, -1)));

          if (!isRegistered) {
            issues.push({
              sourceFile: relPath,
              destinationRoute: dest,
              issueType: "UNREGISTERED_ROUTE_DESTINATION",
              details: `Navigation target "${dest}" does not match any registered route in frontend/src/routes`,
            });
          }
        }

        // Match navigate({ to: "..." }) or navigate("...")
        const navRegex = /navigate\(\s*(?:{\s*to:\s*["']([^"']+)["']|["']([^"']+)["'])/g;
        let navMatch;
        while ((navMatch = navRegex.exec(content)) !== null) {
          const dest = navMatch[1] || navMatch[2];
          if (!dest || !dest.startsWith("/")) continue;

          totalLinksChecked++;
          const cleanDest = dest.split("?")[0].split("#")[0];

          const isRegistered = registeredRoutes.has(cleanDest) ||
            registeredRoutes.has(cleanDest + "/") ||
            (cleanDest.endsWith("/") && registeredRoutes.has(cleanDest.slice(0, -1)));

          if (!isRegistered) {
            issues.push({
              sourceFile: relPath,
              destinationRoute: dest,
              issueType: "UNREGISTERED_NAVIGATE_TARGET",
              details: `Programmatic navigate target "${dest}" does not match any registered route`,
            });
          }
        }
      }
    }
  }

  scanForLinks(srcDir);

  console.log(`\n[STEP 2] Scanned source files. Total navigation references checked: ${totalLinksChecked}`);

  // 3. Report Discovered Issues
  console.log(`\n[STEP 3] Forensic Navigation Issues Found: ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach((iss, idx) => {
      console.log(`\nIssue #${idx + 1}: [${iss.issueType}]`);
      console.log(`  Source File: ${iss.sourceFile}`);
      console.log(`  Destination Route: ${iss.destinationRoute}`);
      console.log(`  Details: ${iss.details}`);
    });
    throw new Error(`FAIL: Found ${issues.length} invalid or unregistered navigation destinations!`);
  } else {
    console.log("  [PASS] All navigation references point strictly to registered application routes!");
  }

  console.log("\n=== FORENSIC NAVIGATION AUDIT COMPLETED SUCCESSFULLY ===");
}

runForensicNavigationSuite();
