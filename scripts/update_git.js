const fs = require('fs');
const path = require('path');

// Define the paths
const templatePath = path.join(__dirname, '..', 'scripts', '_gitconfig_template');
const gitConfigPath = path.join(__dirname, '..', '.git', 'config');

// Function to parse git config file into sections and properties
function parseGitConfig(content) {
	const config = {};
	let currentSection = null;
	let currentSubsection = null;

	const lines = content.split('\n');

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Skip empty lines and comments
		if (!trimmedLine || trimmedLine.startsWith('#')) continue;

		// Check for section headers like [core] or [remote "origin"]
		const sectionMatch = trimmedLine.match(/^\[(.*?)(?:\s+"(.*)")?\]$/);
		if (sectionMatch) {
			currentSection = sectionMatch[1];
			currentSubsection = sectionMatch[2] || null;

			if (!config[currentSection]) {
				config[currentSection] = {};
			}

			if (currentSubsection && !config[currentSection][currentSubsection]) {
				config[currentSection][currentSubsection] = {};
			}

			continue;
		}

		// Process key-value pairs
		const propertyMatch = trimmedLine.match(/^(\s*)([^=]+?)(\s*)=(\s*)(.*?)(\s*)$/);
		if (propertyMatch && currentSection) {
			const key = propertyMatch[2].trim();
			const value = propertyMatch[5].trim();

			if (currentSubsection) {
				config[currentSection][currentSubsection][key] = value;
			} else {
				config[currentSection][key] = value;
			}
		}
	}

	return config;
}

// Function to convert the parsed config back to string
function configToString(config) {
	let result = '';

	for (const section in config) {
		for (const key in config[section]) {
			const value = config[section][key];

			if (typeof value === 'object') {
				// This is a subsection
				for (const subKey in value) {
					result += `[${section} "${key}"]\n`;
					for (const subProp in value[subKey]) {
						result += `\t${subProp} = ${value[subKey][subProp]}\n`;
					}
					result += '\n';
				}
			} else {
				// This is a regular key-value in a section
				if (!result.includes(`[${section}]`)) {
					result += `[${section}]\n`;
				}
				result += `\t${key} = ${value}\n`;
			}
		}
		result += '\n';
	}

	return result;
}

// Function to merge two parsed configs
function mergeConfigs(original, template) {
	const merged = JSON.parse(JSON.stringify(original)); // Deep clone the original

	// Merge template into original
	for (const section in template) {
		if (!merged[section]) {
			merged[section] = {};
		}

		for (const key in template[section]) {
			const value = template[section][key];

			if (typeof value === 'object') {
				// This is a subsection
				if (!merged[section][key]) {
					merged[section][key] = {};
				}

				for (const subKey in value) {
					merged[section][key][subKey] = value[subKey];
				}
			} else {
				// This is a regular key-value
				merged[section][key] = value;
			}
		}
	}

	return merged;
}

// Main function to merge git configs
function mergeGitConfig() {
	try {
		// Check if template file exists
		if (!fs.existsSync(templatePath)) {
			console.error(`Error: Template file not found at ${templatePath}`);
			process.exit(1);
		}

		// Check if git config exists
		if (!fs.existsSync(gitConfigPath)) {
			console.error(`Error: Git config not found at ${gitConfigPath}`);
			process.exit(1);
		}

		// Read files
		const originalContent = fs.readFileSync(gitConfigPath, 'utf8');
		const templateContent = fs.readFileSync(templatePath, 'utf8');

		console.log('Files read successfully');

		// Parse both configs
		const originalConfig = parseGitConfig(originalContent);
		const templateConfig = parseGitConfig(templateContent);

		// Merge configs
		const mergedConfig = mergeConfigs(originalConfig, templateConfig);

		// Convert back to string
		const mergedContent = configToString(mergedConfig);

		// Write the merged config back to the file
		fs.writeFileSync(gitConfigPath, mergedContent);

		console.log('Successfully merged git configurations');
	} catch (error) {
		console.error('An error occurred:', error.message);
		process.exit(1);
	}
}

// Execute the function
mergeGitConfig();
