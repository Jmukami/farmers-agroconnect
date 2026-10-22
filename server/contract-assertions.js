import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import Ajv from 'ajv';

const contract = parse(readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));
const ajv = new Ajv({ allErrors: true, nullable: true, formats: { password: () => true } });
const validators = new Map();

// OpenAPI 3.0 uses boolean exclusiveMinimum; Ajv's default draft uses a numeric bound.
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  if (typeof result.exclusiveMinimum === 'boolean') {
    if (result.exclusiveMinimum) result.exclusiveMinimum = result.minimum;
    else delete result.exclusiveMinimum;
  }
  return result;
}

export function compileContractSchema(schema) {
  return ajv.compile(normalize({ ...schema, components: contract.components }));
}

export function assertContract(path, method, status, data) {
  const pathname = `/api${path.split('?')[0]}`;
  const template = Object.keys(contract.paths).find((candidate) => new RegExp(`^${candidate.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(pathname));
  assert.ok(template, `Undocumented route: ${method} ${pathname}`);
  const operation = contract.paths[template][method.toLowerCase()];
  assert.ok(operation, `Undocumented operation: ${method} ${template}`);
  const response = operation.responses[status];
  assert.ok(response, `Undocumented response: ${method} ${template} → ${status}`);
  const schema = response.content?.['application/json']?.schema;
  if (!schema) return;
  const key = `${method}:${template}:${status}`;
  if (!validators.has(key)) validators.set(key, compileContractSchema(schema));
  const validate = validators.get(key);
  assert.ok(validate(data), `${key}: ${ajv.errorsText(validate.errors)}`);
}
