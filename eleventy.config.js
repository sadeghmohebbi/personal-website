const { DateTime } = require("luxon")
const markdownItAnchor = require("markdown-it-anchor")
const markdownItAttrs = require("markdown-it-attrs")
const markdownItForInlineIterator = require('markdown-it-for-inline')
const htmlMinifier = require("html-minifier-terser")
const CleanCSS = require('clean-css')
const { glob } = require('glob')
const fs = require('fs')
const path = require('path')

const pluginRss = require("@11ty/eleventy-plugin-rss")
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight")
const pluginBundle = require("@11ty/eleventy-plugin-bundle")
const pluginNavigation = require("@11ty/eleventy-navigation")
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy")

const pluginDrafts = require("./eleventy.config.drafts.js")
const pluginImages = require("./eleventy.config.images.js")

module.exports = function(eleventyConfig) {
	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`
	eleventyConfig.addPassthroughCopy({
		"./public/": "/",
		"./node_modules/prismjs/themes/prism-okaidia.css": "/css/prism-okaidia.css"
	})

	// Run Eleventy when these files change:
	// https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets

	// Watch content images for the image pipeline.
	eleventyConfig.addWatchTarget("content/**/*.{svg,webp,png,jpeg}")

	// App plugins
	eleventyConfig.addPlugin(pluginDrafts)
	eleventyConfig.addPlugin(pluginImages)

	// Official plugins
	eleventyConfig.addPlugin(pluginRss)
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 }
	})
	eleventyConfig.addPlugin(pluginNavigation)
	eleventyConfig.addPlugin(EleventyHtmlBasePlugin)
	eleventyConfig.addPlugin(pluginBundle)

	// Filters
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy")
	})

	eleventyConfig.addFilter('htmlDateString', (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd')
	})

	eleventyConfig.addFilter("htmlLiner", (array, preNewLine) => {
		if (preNewLine && Array.isArray(array)) {
			array.unshift('')
		}
		return (array || []).join('<p><br></p>')
	})

	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if(!Array.isArray(array) || array.length === 0) {
			return []
		}
		if( n < 0 ) {
			return array.slice(n)
		}

		return array.slice(0, n)
	})

	// Return the smallest number argument
	eleventyConfig.addFilter("min", (...numbers) => {
		return Math.min.apply(null, numbers)
	})

	// Return all the tags used in a collection
	eleventyConfig.addFilter("getAllTags", collection => {
		let tagSet = new Set()
		for(let item of collection) {
			(item.data.tags || []).forEach(tag => tagSet.add(tag))
		}
		return Array.from(tagSet)
	})

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1)
	})

	// Customize Markdown library settings:
	eleventyConfig.amendLibrary("md", mdLib => {
		mdLib.use(markdownItAnchor, {
			permalink: markdownItAnchor.permalink.ariaHidden({
				placement: "after",
				class: "header-anchor",
				symbol: "#",
				ariaHidden: false,
			}),
			level: [1,2,3,4],
			slugify: eleventyConfig.getFilter("slugify")
		})
		mdLib.use(markdownItAttrs, {
			// optional, these are default options
			leftDelimiter: '{',
			rightDelimiter: '}',
			allowedAttributes: []  // empty array = all attributes are allowed
		})
		mdLib.use(markdownItForInlineIterator, 'url_new_win', 'link_open', function (tokens, idx) {
			tokens[idx].attrSet('target', '_blank')
		})
	})

	eleventyConfig.on('afterBuild', () => {
		//Minify CSS files in-place
		const cwdCSS = path.join(__dirname,'./_site/css')
		glob('**/*.css', { cwd: cwdCSS }).then((cssFiles) => {
			if (Array.isArray(cssFiles) && cssFiles.length > 0) {
				const fsOpt = { encoding: 'utf-8' }
				cssFiles.map((cssFile) => path.join(cwdCSS, cssFile)).forEach((cssFilePath) => {
					console.log( `[11ty/cssmin] ${cssFilePath} minified.` )
					const originalCSS = fs.readFileSync(cssFilePath, fsOpt)
					const minifiedCSS = new CleanCSS().minify(originalCSS).styles
					fs.writeFileSync(cssFilePath, minifiedCSS, fsOpt)
				})
			}
		}).catch(err => console.error(err))

		//Minify HTML files in-place
		const cwd = path.join(__dirname,'./_site')
		glob('**/*.html', { cwd }).then((htmlFiles) => {
			if (Array.isArray(htmlFiles) && htmlFiles.length > 0) {
				const fsOpt = { encoding: 'utf-8' }
				htmlFiles.map((htmlFile) => path.join(cwd, htmlFile)).forEach((htmlFilePath) => {
					console.log( `[11ty/htmlmin] ${htmlFilePath} minified.` )
					const originalHTML = fs.readFileSync(htmlFilePath, fsOpt)
					htmlMinifier.minify(originalHTML, {
						collapseWhitespace: true,
						removeComments: true,  
						useShortDoctype: true,
					}).then((minifiedHTML) => {
						if (minifiedHTML) {
							fs.writeFileSync(htmlFilePath, minifiedHTML, fsOpt)
						}
					}).catch(err => console.error(err))
				})
			}
		}).catch(err => console.error(err))
	})

	// Features to make your build faster (when you need them)

	// If your passthrough copy gets heavy and cumbersome, add this line
	// to emulate the file copy on the dev server. Learn more:
	// https://www.11ty.dev/docs/copy/#emulate-passthrough-copy-during-serve

	// eleventyConfig.setServerPassthroughCopyBehavior("passthrough")

	return {
		// Control which files Eleventy will process
		// e.g.: *.md, *.njk, *.html, *.liquid
		templateFormats: [
			"md",
			"njk",
			"html",
			"liquid",
		],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: "njk",

		// Pre-process *.html files with: (default: `liquid`)
		htmlTemplateEngine: "njk",

		// These are all optional:
		dir: {
			input: "content",          // default: "."
			includes: "../_includes",  // default: "_includes"
			data: "../_data",          // default: "_data"
			output: "_site"
		},

		// -----------------------------------------------------------------
		// Optional items:
		// -----------------------------------------------------------------

		// If your site deploys to a subdirectory, change `pathPrefix`.
		// Read more: https://www.11ty.dev/docs/config/#deploy-to-a-subdirectory-with-a-path-prefix

		// When paired with the HTML <base> plugin https://www.11ty.dev/docs/plugins/html-base/
		// it will transform any absolute URLs in your HTML to include this
		// folder name and does **not** affect where things go in the output folder.
		pathPrefix: "/",
	}
}
