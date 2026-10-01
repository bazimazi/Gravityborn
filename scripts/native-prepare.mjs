import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const xcode = require('xcode');
const file = 'ios/App/App.xcodeproj/project.pbxproj';
const project = xcode.project(file);
project.parseSync();
if (!(await readFile(file, 'utf8')).includes('PrivacyInfo.xcprivacy in Resources'))
  throw new Error('iOS privacy manifest is missing from the Resources build phase.');
const privacy = await readFile('ios/App/App/PrivacyInfo.xcprivacy', 'utf8');
for (const reason of [
  'NSPrivacyAccessedAPICategoryUserDefaults',
  'CA92.1',
  'NSPrivacyAccessedAPICategoryFileTimestamp',
  'C617.1',
])
  if (!privacy.includes(reason)) throw new Error(`iOS privacy declaration missing: ${reason}`);
console.log('Native privacy manifest included in iOS resources.');
