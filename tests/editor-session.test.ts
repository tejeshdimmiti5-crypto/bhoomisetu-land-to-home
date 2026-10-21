
import test from "node:test";
import assert from "node:assert/strict";
import { isEditorSessionCurrent } from "../lib/editor-session";

test("accepts a save result from the current editor session", () => {
  assert.equal(isEditorSessionCurrent(3, 3), true);
});

test("rejects a save result after the editor session changes", () => {
  assert.equal(isEditorSessionCurrent(3, 4), false);
});

test("rejects a save result after multiple editor changes", () => {
  assert.equal(isEditorSessionCurrent(3, 6), false);
});
