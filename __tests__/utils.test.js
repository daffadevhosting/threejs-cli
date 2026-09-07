import { compareVersions, normalizeVersion } from '../bin/lib/utils.js';

describe('version helpers', () => {
  test('normalizeVersion strips leading v and suffixes', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
    expect(normalizeVersion('1.2.3-beta.1')).toBe('1.2.3');
  });

  test('compareVersions handles semver ordering', () => {
    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
    expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });
});
