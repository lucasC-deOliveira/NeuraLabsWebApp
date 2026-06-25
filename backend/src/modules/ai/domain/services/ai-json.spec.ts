import { describe, it, expect } from 'vitest';
import { parseAiJson } from './ai-json';
import { InvalidAiJsonError } from '../errors';

describe('parseAiJson', () => {
  it('parses raw JSON', () => {
    expect(parseAiJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses a ```json fenced block', () => {
    expect(parseAiJson('Aqui está:\n```json\n{"a":1}\n```\nfim')).toEqual({ a: 1 });
  });

  it('parses a plain fenced block', () => {
    expect(parseAiJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts the largest brace span from surrounding prose', () => {
    expect(parseAiJson('blá {"a":1} blá')).toEqual({ a: 1 });
  });

  it('throws on text without any JSON', () => {
    expect(() => parseAiJson('sem json aqui')).toThrow(InvalidAiJsonError);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseAiJson('{"a":}')).toThrow(InvalidAiJsonError);
  });
});
