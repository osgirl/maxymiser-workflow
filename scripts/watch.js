const babel = require('babel-core');
const chalk = require('chalk');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

const rootPath = path.resolve('.');
const appDirectory = fs.realpathSync(process.cwd());
const watchDir = path.resolve(appDirectory, 'src');
const srcFile = path.resolve(appDirectory, './config/replace_cg_v5.js');
const outFile = path.resolve(appDirectory, `./dist/${path.basename(srcFile)}`);
const relativeOutFile = path.relative(rootPath, outFile);

const babelOptions = require('../config/babel.config');

console.log(chalk.green('Watching', path.relative(rootPath, watchDir)));

let timeout = false;
let changedFiles = new Set();

async function generateFile() {
	return new Promise(function(resolve, reject) {
		var output = babel.transformFileSync(srcFile, babelOptions);
		mkdirp(path.dirname(outFile), function(writeErr) {
			if (writeErr) {
				console.log(chalk.red(outFile, writeErr));
			} else {
				fs.writeFileSync(outFile, output.code);
				console.log(chalk.green(`File written: "${relativeOutFile}"`));
			}
			timeout = false;
			changedFiles.clear();

			resolve(writeErr ? false : true);
		});
	});
}

generateFile();

let srcfileChanged = false;
fs.watch(srcFile, {}, async (eventType, filename) => {
	if (!srcfileChanged && eventType === 'change') {
		srcfileChanged = true;
		const filePath = path.relative(
			rootPath,
			path.resolve(watchDir, filename)
		);
		console.log(chalk.cyan(`File changed: "${filePath}"`));
		try {
			await generateFile();
		} catch(error){
			chalk.red(`Error: "${error}"`);
		}
		srcfileChanged = false;
	}
});

fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
	const filePath = path.relative(rootPath, path.resolve(watchDir, filename));
	if (eventType === 'change') {
		if (filename) {
			if (!changedFiles.has(filename)) {
				changedFiles.add(filename);
				console.log(chalk.cyan(`File changed: "${filePath}"`));
			}
			if (!timeout) {
				console.log(
					chalk.cyan(`Queue file generation: "${relativeOutFile}"`)
				);
				timeout = setTimeout(generateFile, 500);
			}
		}
	} else {
		console.log(
			chalk.red(`Error: eventType="${eventType}" filename="${filename}"`)
		);
	}
});
