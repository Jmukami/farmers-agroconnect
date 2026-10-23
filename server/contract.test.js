import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDocument } from 'yaml';
import { compileContractSchema } from './contract-assertions.js';

test('OpenAPI parses without duplicate keys and all operation schemas resolve', () => {
  const document = parseDocument(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));
  assert.deepEqual(document.errors, []);
  const contract = document.toJSON();
  const operationIds = new Set();
  const tagNames = contract.tags.map((tag) => tag.name);
  assert.equal(new Set(tagNames).size, tagNames.length);
  for (const schema of Object.values(contract.components.schemas)) compileContractSchema(schema);
  for (const methods of Object.values(contract.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      assert.ok(!operationIds.has(operation.operationId), `Duplicate operationId: ${operation.operationId}`);
      operationIds.add(operation.operationId);
      const parameters = operation.parameters || [];
      const parameterKeys = parameters.map((parameter) => `${parameter.in}:${parameter.name}`);
      assert.equal(new Set(parameterKeys).size, parameterKeys.length, `Duplicate parameters: ${operation.operationId}`);
      for (const tag of operation.tags || []) assert.ok(tagNames.includes(tag), `Undeclared tag: ${tag}`);
      for (const media of Object.values(operation.requestBody?.content || {})) if (media.schema) compileContractSchema(media.schema);
      for (const response of Object.values(operation.responses)) for (const media of Object.values(response.content || {})) if (media.schema) compileContractSchema(media.schema);
    }
  }
});
