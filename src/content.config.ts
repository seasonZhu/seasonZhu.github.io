import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// 加载博客目录下的 Markdown 和 MDX 文章。
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// 校验文章元数据。
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// 将日期字符串转换为 Date 对象。
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
		}),
});

export const collections = { blog };
