// Related to the `drafts` preprocessor in eleventy.config.js
// (base-blog v9 uses zod here; this is a dependency-free equivalent)
export default function(data) {
	if(data.draft !== undefined && typeof data.draft !== "boolean") {
		throw new Error(`Invalid \`draft\` value on ${data.page?.inputPath}: expected boolean, got ${JSON.stringify(data.draft)}`)
	}
}
