#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
function parseArgs() {
	const args = process.argv.slice(2);
	const projectNameArg = args.find((arg) => arg.startsWith('--project-name='));

	if (!projectNameArg) {
		console.error('Error: Missing required argument --project-name');
		console.error('Usage: node rename-project.js --project-name=new-project-name');
		process.exit(1);
	}

	const newProjectName = projectNameArg.split('=')[1];

	if (!newProjectName) {
		console.error('Error: Project name cannot be empty');
		process.exit(1);
	}

	return { newProjectName };
}

// Validate project name
function validateProjectName(name) {
	// Angular project names should follow npm package name rules
	// Lowercase letters, numbers, and hyphens only
	const validNameRegex = /^[a-z0-9-]+$/;

	if (!validNameRegex.test(name)) {
		console.error('Error: Project name must contain only lowercase letters, numbers, and hyphens');
		process.exit(1);
	}

	return true;
}

// Main function to rename the project
async function renameProject() {
	try {
		// Parse and validate arguments
		const { newProjectName } = parseArgs();
		validateProjectName(newProjectName);

		// Read angular.json
		const angularJsonPath = path.join(process.cwd(), 'angular.json');

		if (!fs.existsSync(angularJsonPath)) {
			console.error('Error: angular.json not found in the current directory');
			process.exit(1);
		}

		const angularJsonContent = fs.readFileSync(angularJsonPath, 'utf8');
		const angularJson = JSON.parse(angularJsonContent);

		// Find the current project name (assuming there's only one or we want the first one)
		const projectNames = Object.keys(angularJson.projects);

		if (projectNames.length === 0) {
			console.error('Error: No projects found in angular.json');
			process.exit(1);
		}

		const currentProjectName = projectNames[0];
		console.log(`Found project: ${currentProjectName}`);

		if (currentProjectName === newProjectName) {
			console.log('Project already has the requested name. No changes needed.');
			process.exit(0);
		}

		// Get the current project configuration
		const currentProject = angularJson.projects[currentProjectName];
		const currentPath = currentProject.root;
		const newPath = currentPath.replace(currentProjectName, newProjectName);

		console.log(`Renaming project from '${currentProjectName}' to '${newProjectName}'`);
		console.log(`Updating path from '${currentPath}' to '${newPath}'`);

		// Create a new projects object with the new name
		const newProjects = {};
		newProjects[newProjectName] = currentProject;
		delete angularJson.projects[currentProjectName];
		angularJson.projects = newProjects;

		// Update all path references in the project configuration
		function replaceAllPaths(obj) {
			for (const key in obj) {
				if (typeof obj[key] === 'string') {
					// Replace all occurrences of the old project name in paths
					obj[key] = obj[key].replace(new RegExp(currentProjectName, 'g'), newProjectName);
				} else if (Array.isArray(obj[key])) {
					// Handle arrays (like polyfills, assets, styles)
					obj[key] = obj[key].map((item) => {
						if (typeof item === 'string') {
							return item.replace(new RegExp(currentProjectName, 'g'), newProjectName);
						} else if (typeof item === 'object' && item !== null) {
							replaceAllPaths(item);
						}
						return item;
					});
				} else if (typeof obj[key] === 'object' && obj[key] !== null) {
					// Recursively update nested objects
					replaceAllPaths(obj[key]);
				}
			}
		}

		// Update all paths in the project configuration
		replaceAllPaths(angularJson.projects[newProjectName]);

		// Update root, sourceRoot, and other paths
		angularJson.projects[newProjectName].root = newPath;
		angularJson.projects[newProjectName].sourceRoot = newPath + '/src';

		// Handle configurations that might contain the project name
		const architect = angularJson.projects[newProjectName].architect;

		// Update build configuration
		if (architect.build) {
			architect.build.options.outputPath = `dist/${newProjectName}`;
		}

		// Update serve configuration
		if (architect.serve && architect.serve.configurations) {
			if (architect.serve.configurations.production) {
				architect.serve.configurations.production.buildTarget =
					architect.serve.configurations.production.buildTarget.replace(currentProjectName, newProjectName);
			}
			if (architect.serve.configurations.development) {
				architect.serve.configurations.development.buildTarget =
					architect.serve.configurations.development.buildTarget.replace(currentProjectName, newProjectName);
			}
		}

		// Write updated angular.json
		fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2), 'utf8');
		console.log('Updated angular.json successfully');

		// Rename the project directory
		if (fs.existsSync(currentPath)) {
			fs.mkdirSync(newPath, { recursive: true });

			// Copy all files from old directory to new directory
			function copyDir(src, dest) {
				fs.mkdirSync(dest, { recursive: true });
				const entries = fs.readdirSync(src, { withFileTypes: true });

				for (const entry of entries) {
					const srcPath = path.join(src, entry.name);
					const destPath = path.join(dest, entry.name);

					if (entry.isDirectory()) {
						copyDir(srcPath, destPath);
					} else {
						fs.copyFileSync(srcPath, destPath);
					}
				}
			}

			copyDir(currentPath, newPath);

			// Remove old directory after successful copy
			fs.rmSync(currentPath, { recursive: true, force: true });
			console.log(`Renamed project directory from ${currentPath} to ${newPath}`);

			// Update tsconfig paths
			updateTSConfigPaths(currentProjectName, newProjectName);

			console.log(`\nProject successfully renamed from '${currentProjectName}' to '${newProjectName}'`);
			console.log(`You may need to update imports and references in your code.`);
		} else {
			console.error(`Warning: Project directory '${currentPath}' not found. Only angular.json was updated.`);
		}
	} catch (error) {
		console.error('An error occurred:', error.message);
		process.exit(1);
	}
}

// Update tsconfig.json if it exists
function updateTSConfigPaths(oldName, newName) {
	const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');

	if (fs.existsSync(tsConfigPath)) {
		try {
			const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

			// Update paths if they exist
			if (tsConfig.compilerOptions && tsConfig.compilerOptions.paths) {
				const paths = tsConfig.compilerOptions.paths;

				for (const key in paths) {
					if (key.includes(oldName)) {
						const newKey = key.replace(oldName, newName);
						paths[newKey] = paths[key].map((p) => p.replace(oldName, newName));
						delete paths[key];
					} else {
						paths[key] = paths[key].map((p) => p.replace(oldName, newName));
					}
				}

				fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2), 'utf8');
				console.log('Updated tsconfig.json paths');
			}
		} catch (error) {
			console.error('Warning: Failed to update tsconfig.json:', error.message);
		}
	}
}

// Run the script
renameProject();
