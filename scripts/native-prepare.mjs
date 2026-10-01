import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const xcode = require('xcode');
const file = 'ios/App/App.xcodeproj/project.pbxproj';
const project = xcode.project(file);
project.parseSync();
if (!(await readFile(file, 'utf8')).includes('PrivacyInfo.xcprivacy in Resources'))
  throw new Error('iOS privacy manifest is missing from the Resources build phase.');
console.log('Native privacy manifest included in iOS resources.');
