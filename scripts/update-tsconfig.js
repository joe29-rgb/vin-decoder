const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'tsconfig.json');
const src = fs.readFileSync(file, 'utf8');
const json = JSON.parse(src);

json.compilerOptions = json.compilerOptions || {};
json.compilerOptions.declaration = true;
json.compilerOptions.sourceMap = true;
json.compilerOptions.baseUrl = json.compilerOptions.baseUrl || '.';
json.compilerOptions.paths = Object.assign({}, json.compilerOptions.paths, {
  '@config/*': ['src/config/*'],
  '@utils/*': ['src/utils/*'],
  '@api/*': ['src/api/*'],
  '@services/*': ['src/services/*'],
  '@types/*': ['src/types/*'],
  '@modules/*': ['src/modules/*']
});

fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log('tsconfig.json updated');
