interface PosterContent {
	title: string;
	description: string;
	site: string;
	qr: string;
	hue: number;
	cover: string[];
}

function loadImage(src: string, timeout = 3500): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = "anonymous";
		const timer = window.setTimeout(() => reject(new Error("图片加载超时")), timeout);
		image.onload = () => {
			window.clearTimeout(timer);
			resolve(image);
		};
		image.onerror = () => {
			window.clearTimeout(timer);
			reject(new Error("图片无法加载"));
		};
		image.src = src;
	});
}

function drawText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	width: number,
	lineHeight: number,
	maxLines: number,
): void {
	const lines: string[] = [];
	let line = "";
	for (const char of Array.from(text.trim().replace(/\s+/g, " "))) {
		if (line && ctx.measureText(line + char).width > width) {
			lines.push(line.trimEnd());
			line = char.trimStart();
		} else {
			line += char;
		}
	}
	if (line) lines.push(line.trimEnd());

	for (const [index, value] of lines.slice(0, maxLines).entries()) {
		let rendered = value;
		if (index === maxLines - 1 && lines.length > maxLines) {
			while (ctx.measureText(`${rendered}…`).width > width && rendered) {
				rendered = Array.from(rendered).slice(0, -1).join("");
			}
			rendered += "…";
		}
		ctx.fillText(rendered, x, y + index * lineHeight);
	}
}

export async function createSharePoster(content: PosterContent): Promise<Blob> {
	const canvas = document.createElement("canvas");
	canvas.width = 900;
	canvas.height = 1200;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("浏览器无法绘制分享图");

	const ink = "#152137";
	const accent = `oklch(0.5 0.16 ${content.hue})`;
	const fonts = 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif';
	const gradient = ctx.createLinearGradient(0, 0, 900, 1200);
	gradient.addColorStop(0, `oklch(0.93 0.04 ${content.hue})`);
	gradient.addColorStop(1, "#ffffff");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 900, 1200);

	const coverCandidates = Promise.allSettled(content.cover.filter(Boolean).map((src) => loadImage(src)));
	const [qr, candidates] = await Promise.all([loadImage(content.qr), coverCandidates]);
	const cover = candidates.find((candidate) => candidate.status === "fulfilled")?.value;
	const left = 70;
	const top = 128;
	const width = 760;
	const height = 382;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(left, top, width, height, 24);
	ctx.clip();
	if (cover) {
		const scale = Math.max(width / cover.naturalWidth, height / cover.naturalHeight);
		const w = cover.naturalWidth * scale;
		const h = cover.naturalHeight * scale;
		ctx.drawImage(cover, left + (width - w) / 2, top + (height - h) / 2, w, h);
	} else {
		const fallback = ctx.createLinearGradient(left, top, left + width, top + height);
		fallback.addColorStop(0, ink);
		fallback.addColorStop(1, accent);
		ctx.fillStyle = fallback;
		ctx.fillRect(left, top, width, height);
		ctx.fillStyle = "#fff";
		ctx.font = `bold 52px ${fonts}`;
		drawText(ctx, content.site, left + 48, top + 210, width - 96, 60, 1);
	}
	ctx.restore();

	ctx.fillStyle = accent;
	ctx.font = `bold 29px ${fonts}`;
	drawText(ctx, content.site, left, 89, width, 36, 1);

	ctx.fillStyle = ink;
	ctx.font = `bold 58px ${fonts}`;
	drawText(ctx, content.title, left, 605, width, 72, 3);

	ctx.fillStyle = "#49546a";
	ctx.font = `32px ${fonts}`;
	drawText(ctx, content.description, left, 820, width, 44, 3);

	ctx.fillStyle = "#d4dce9";
	ctx.fillRect(left, 952, width, 2);
	ctx.drawImage(qr, 666, 981, 164, 164);
	ctx.fillStyle = accent;
	ctx.font = `bold 31px ${fonts}`;
	ctx.fillText("扫描二维码阅读原文", left, 1056);

	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片导出失败")), "image/png");
	});
}
