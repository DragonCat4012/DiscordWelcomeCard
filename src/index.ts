import { GuildMember } from 'discord.js';
import { createCanvas, loadImage, CanvasRenderingContext2D as ctx2D, Canvas, Image } from 'canvas';
import { join } from 'path';
import { writeFileSync } from "fs";

const production = true;

declare global {
    interface CanvasRenderingContext2D {
        width: number; w: number;
        height: number; h: number;
        theme: Theme;

        roundRect(x: number, y: number, w: number, h: number, r: number): this
        changeFont(font: string): this
        changeFontSize(size: string): this
        blur(strength: number): this
    }
}

ctx2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}

ctx2D.prototype.changeFont = function (font) {
    var fontArgs = this.font.split(' ');
    this.font = fontArgs[0] + ' ' + font; /// using the first part
    return this;
}

ctx2D.prototype.changeFontSize = function (size) {
    var fontArgs = this.font.split(' ');
    this.font = size + ' ' + fontArgs.slice(1).join(' '); /// using the last part
    return this;
}

ctx2D.prototype.blur = function (strength = 1) {
    this.globalAlpha = 0.5; // Higher alpha made it more smooth
    // Add blur layers by strength to x and y
    // 2 made it a bit faster without noticeable quality loss
    for (var y = -strength; y <= strength; y += 2) {
        for (var x = -strength; x <= strength; x += 2) {
            // Apply layers
            this.drawImage(this.canvas, x, y);
            // Add an extra layer, prevents it from rendering lines
            // on top of the images (does makes it slower though)
            if (x >= 0 && y >= 0) {
                this.drawImage(this.canvas, -(x - 1), -(y - 1));
            }
        }
    }
    this.globalAlpha = 1.0;


    return this;
}










export type Theme = {
    color: string | Gradient;
    image: string | Buffer;
    font?: string;
}

export class Gradient {
    type: 'linear' | 'radial';
    colors: { offset: number; color: string; }[];
    grad: CanvasGradient;

    constructor(type: 'linear' | 'radial' = 'linear', ...colors: { offset: number; color: string; }[]) {
        this.type = type;
        this.colors = colors ?? [];
    }

    addColorStop(offset: number, color: string) {
        this.colors.push({ offset, color });
    }

    toString(ctx: ctx2D) {
        var grad = this.type === 'linear' ?
            ctx.createLinearGradient(0, 0, ctx.w, ctx.h)
            : ctx.createRadialGradient(ctx.w / 2, ctx.h / 2, ctx.w / 2, ctx.w / 2, ctx.h / 2, ctx.w / 2);

        for (const v of this.colors) grad.addColorStop(v.offset, v.color)

        return grad;
    }
}

export type ThemeType = (keyof typeof themes) | Theme;


const root = join(__dirname, '..', 'images')
export var themes = {
    'dark': { color: '#ffffff', image: join(root, 'dark.png') },
    'sakura': { color: '#7d0b2b', image: join(root, 'sakura.png') },
    'blue': { color: '#040f57', image: join(root, 'blue.png') },
    'bamboo': { color: '#137a0d', image: join(root, 'bamboo.png') },
    'desert': { color: '#000000', image: join(root, 'desert.png'), font: 'Segoe Print' },
    'code': { color: '#ffffff', image: join(root, 'code.png'), font: 'Source Sans Pro' },
}





function getFontSize(str: string) {
    if (str.length < 18) return 30;
    return (600 * Math.pow(str.length, -1.05)).toFixed(0);
}

export type ModuleFunction = (ctx: ctx2D) => any
export type CardOptions = {
    theme?: ThemeType;
    title?: string;
    text?: string;
    subtitle?: string;
    avatar?: Canvas | Image | Buffer | string;
    blur?: boolean | number;
    border?: boolean;
    rounded?: boolean;
    custom?: ModuleFunction;
}




var count = 0;
function snap(c: Canvas) {
    if (!production) writeFileSync(`./snapshots/${count}.png`, c.toBuffer('image/png'));
    count++;
}


export async function drawCard(options: CardOptions): Promise<Buffer> {
    const w = 700, h = 250;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.w = ctx.width = w;
    ctx.h = ctx.height = h;

    //@ts-ignore
    var theme: Theme = options.theme ?? 'sakura';

    var background: Image;


    //Parsing the Theme
    if (typeof theme === 'string') {
        //Builtin Theme
        theme = themes[theme];
        if (!theme) throw new Error('Invalid theme, use: ' + Object.keys(themes).join(' | '));

        background = await loadImage(theme.image);
    } else {
        //Loading the Background
        try {
            background = await loadImage(theme.image);
        } catch (e) { throw new Error('Invalid Path or Buffer provided.') }
    }

    ctx.theme = theme;
    const b = 10; //Border

    //Background
    snap(canvas);
    if (options.rounded) ctx.roundRect(0, 0, w, h, h / 15);
    else ctx.rect(0, 0, w, h);
    ctx.clip();

    if (options.border) {
        ctx.drawImage(background, 0, 0, w, h);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;

        ctx.blur(3);
    }


    snap(canvas);
    //Rounded Edges
    if (options.border) {
        if (options.rounded) ctx.roundRect(b, b, w - 2 * b, h - 2 * b, h / 15);
        else ctx.rect(b, b, w - (2 * b), h - (2 * b));
        ctx.clip();
    } else {
        if (options.rounded) ctx.roundRect(0, 0, w, h, h / 15).clip();
        else ctx.rect(0, 0, w, h);
    }


    var temp: Canvas | Image = background;
    if (options.blur) {
        console.log('Q');
        var blur = createCanvas(w, h), blur_ctx = blur.getContext('2d') as ctx2D;
        blur_ctx.drawImage(background, 0, 0, w, h);

        if (typeof options.blur === 'boolean') blur_ctx.blur(3);
        else blur_ctx.blur(options.blur);

        temp = blur;
    }
    if (options.border) ctx.drawImage(temp, b, b, w - b * 2, h - b * 2);
    else ctx.drawImage(temp, 0, 0, w, h);


    snap(canvas);


    //Setting Styles
    ctx.fillStyle = theme.color.toString(ctx);
    ctx.strokeStyle = theme.color.toString(ctx);
    ctx.font = '30px ' + (theme.font ? theme.font : 'sans-serif');


    //Drawing
    //Title
    ctx.changeFontSize('30px')
        .fillText(options.title ?? '', ctx.width / 2.7, ctx.height / 3.5);

    //Text
    ctx.changeFontSize('40px')
        .fillText(options.text ?? '', ctx.width / 2.7, ctx.height / 1.8, (ctx.w * 3) / 5);

    //Subtitle
    ctx.changeFontSize('25px')
        .fillText(options.subtitle ?? '', ctx.width / 2.7, ctx.height / 1.3);

    //Avatar Image
    const radius = h / 2.5;

    ctx.lineWidth = 6
    ctx.beginPath();
    ctx.arc(h / 2, h / 2, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    if (options.avatar) {
        if (options.avatar instanceof Canvas || options.avatar instanceof Image)
            ctx.drawImage(options.avatar, radius / 4, radius / 4, radius * 2, radius * 2);
        else if (typeof options.avatar === 'string' || options.avatar instanceof Buffer)
            ctx.drawImage(await loadImage(options.avatar), radius / 4, radius / 4, radius * 2, radius * 2);
        else throw new Error('Invalid Avatar Argument');
    }

    if (options.custom) options.custom(ctx);

    snap(canvas);


    return canvas.toBuffer('image/png');
}


export async function welcomeImage(member: GuildMember, opts: CardOptions = {}): Promise<Buffer> {
    opts.title = opts.title ?? `Welcome to this server,`;
    opts.text = opts.text ?? `${member.user.tag}!`;
    opts.subtitle = opts.subtitle ?? `MemberCount: ${member.guild.memberCount}`;
    opts.theme = opts.theme ?? 'sakura';
    opts.avatar = opts.avatar ?? await loadImage(member.user.displayAvatarURL({ format: 'png' }));

    const buff = await drawCard(opts);
    return buff;
}


export async function goodbyeImage(member: GuildMember, opts: CardOptions = {}): Promise<Buffer> {
    opts.title = opts.title ?? `Goodbye,`;
    opts.text = opts.text ?? `${member.user.tag}!`;
    opts.theme = opts.theme ?? 'sakura';
    opts.avatar = opts.avatar ?? await loadImage(member.user.displayAvatarURL({ format: 'png' }));

    const buff = await drawCard(opts);
    return buff;
}