import { DateTime } from "luxon"

export default function(eleventyConfig) {
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
}
