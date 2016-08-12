const cwd = process.cwd();
const fs = require('fs');
const path = require('path');
const pkg = require(path.resolve(cwd, 'package.json'));
const dependencies = Object.keys(pkg.dependencies || {});
const devDependencies = Object.keys(pkg.devDependencies || {});
const allDependencies = dependencies.concat(devDependencies);
allDependencies.sort();
const regexpEscape = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
const patternDependencies = new RegExp(`(['"])(${allDependencies.map(regexpEscape).join('|')})(\\1|/)`, 'g');

const flatten = arr => {
  const flat = [].concat(...arr);
  return flat.some(Array.isArray) ? flatten(flat) : flat;
};

const allFiles = pathname => {
  const items = fs.readdirSync(pathname);
  return flatten(items.map(item => {
    const filepath = path.resolve(pathname, item);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      return allFiles(filepath);
    }

    return filepath;
  }));
};

const usedHash = {};
const files = flatten(process.argv.slice(2).map(p => allFiles(path.resolve(cwd, p))));

files.forEach(filepath => {
  const content = fs.readFileSync(filepath, 'utf8');
  (content.match(patternDependencies) || []).forEach(item => usedHash[item.slice(1, -1)] = true);
});

const used = Object.keys(usedHash);
const possibleUnsed = allDependencies.filter(dep => used.indexOf(dep) === -1);

const output = possibleUnsed
  .filter(item => !/^(babel-|eslint|webpack-|extract-text-webpack-plugin)|(-loader)$/.test(item))
  .map(item => `  ${item}`)
  .join('\n');

console.log(output);
