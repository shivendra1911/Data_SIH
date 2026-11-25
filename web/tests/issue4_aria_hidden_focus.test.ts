import React from "react";
import { renderToString } from "react-dom/server";
import CommandFAB, { FabAction } from "../src/components/Dashboard/CommandFAB";
import assert from "node:assert";

async function runTests() {
  console.log("Running Issue 4 tests: ARIA hidden elements must not be focusable...");

  const mockActions: FabAction[] = [
    {
      id: "action-1",
      label: "Test Action",
      icon: React.createElement("span", null, "Icon"),
      onClick: () => {},
    },
  ];

  // Render CommandFAB in its default closed state (open = false)
  const html = renderToString(React.createElement(CommandFAB, { actions: mockActions }));

  // Check for presence of aria-hidden="true"
  assert(html.includes('aria-hidden="true"'), 'CommandFAB closed state must have aria-hidden="true"');

  // Find the aria-hidden container substring
  const ariaHiddenIdx = html.indexOf('aria-hidden="true"');
  assert(ariaHiddenIdx !== -1, "aria-hidden container must exist");

  // Extract the action menu container
  const menuStart = html.lastIndexOf("<div", ariaHiddenIdx);
  const menuEnd = html.indexOf("</div>", ariaHiddenIdx) + 6;
  const menuHtml = html.slice(menuStart, menuEnd);

  // Any button inside an aria-hidden container MUST have tabindex="-1" to prevent focus violations
  const buttons = menuHtml.match(/<button[^>]*>/g) || [];
  assert(buttons.length > 0, "Menu must contain action buttons");

  for (const btn of buttons) {
    const hasNegativeTabindex = btn.includes('tabindex="-1"');
    assert(
      hasNegativeTabindex,
      `Focusable button found inside aria-hidden="true" container without tabindex="-1": ${btn}`
    );
  }

  // Also assert that the container has invisible/hidden class so assistive tech ignores it
  assert(
    menuHtml.includes("invisible"),
    `aria-hidden container should have 'invisible' class when closed: ${menuHtml}`
  );

  console.log("PASS: All buttons inside aria-hidden container have tabindex='-1' and invisible class.");
  console.log("ALL TESTS PASSED for Issue 4!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err.message);
  process.exit(1);
});
