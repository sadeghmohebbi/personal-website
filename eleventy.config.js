import htmlMinifier from "html-minifier-terser"
import CleanCSS from "clean-css"
import { glob } from "glob"
import fs from "node:fs"
import path from "node:path"

import markdownItAnchor from "markdown-it-anchor"
import markdownItAttrs from "markdown-it-attrs"
import markdownItForInlineIterator from "markdown-it-for-inline"

import { EleventyHtmlBasePlugin } from "@11ty/eleventy"
import pluginRss from "@11ty/eleventy-plugin-rss"
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight"
import pluginNavigation from "@11ty/eleventy-navigation"

import pluginFilters from "./_config/filters.js"
import pluginImages from "./_config/images.js"

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function(eleventyConfig) {
	// Drafts, see also _data/eleventyDataSchema.js
	eleventyConfig.addPreprocessor("drafts", "*", (data, content) => {
		if(data.draft && process.env.ELEVENTY_RUN_MODE === "build") {
			return false
		}
	})

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

	// Per-page bundles, see https://github.com/11ty/eleventy-plugin-bundle
	// Bundle <style> content and adds a {% css %} paired shortcode
	eleventyConfig.addBundle("css", {
		toFileDirectory: "dist",
	})
	// Bundle <script> content and adds a {% js %} paired shortcode
	eleventyConfig.addBundle("js", {
		toFileDirectory: "dist",
	})

	// App plugins
	eleventyConfig.addPlugin(pluginImages)

	// Official plugins
	eleventyConfig.addPlugin(pluginRss)
	eleventyConfig.addPlugin(pluginSyntaxHighlight, {
		preAttributes: { tabindex: 0 }
	})
	eleventyConfig.addPlugin(pluginNavigation)
	eleventyConfig.addPlugin(EleventyHtmlBasePlugin)

	// Filters
	eleventyConfig.addPlugin(pluginFilters)

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
			if (tokens[idx].attrGet('href')?.startsWith('https')) {
				tokens[idx].attrSet('target', '_blank')
			}
		})
	})

	eleventyConfig.on('afterBuild', () => {
		//Minify CSS files in-place
		const cwdCSS = path.join(import.meta.dirname,'./_site/css')
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
		const cwd = path.join(import.meta.dirname,'./_site')
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
}

export const config = {
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
