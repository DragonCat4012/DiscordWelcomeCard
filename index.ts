import { GuildMember, MessageAttachment } from "discord.js";
import { createCanvas, loadImage, CanvasRenderingContext2D as ctx2D, Canvas, Image } from 'canvas';
import { join } from 'path';

export interface Theme {
    color: string;
    image: string | Buffer;
    font?: string;
}

export type ThemeType = (keyof typeof themes) | Theme;
const hexcolor = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/;


const root = join(__dirname, 'images')
export var themes = {
    'dark': { color: '#ffffff', image: join(root, 'dark.png') },
    'sakura': { color: '#7d0b2b', image: join(root, 'sakura.png') },
    'blue': { color: '#040f57', image: join(root, 'blue.png') },
    'bamboo': { color: '#137a0d', image: join(root, 'bamboo.png') },
    'desert': { color: '#000000', image: join(root, 'desert.png') },
    'code': { color: '#ffffff', image: join(root, 'code.png'), font: 'Source Sans Pro' },
}



function getFontSize(str: string) {
    if (str.length < 18) return 30;

    return Math.pow(600 * str.length, -1.05)
}

export function changeFont(ctx: ctx2D, font: string) {
    var fontArgs = ctx.font.split(' ');
    ctx.font = fontArgs[0] + ' ' + font; /// using the first part
}

export function changeFontSize(ctx: ctx2D, size: string) {
    var fontArgs = ctx.font.split(' ');
    ctx.font = size + ' ' + fontArgs.slice(1).join(' '); /// using the last part
}






export var modules = {
    welcomeText: (ctx, canvas: Canvas, member: GuildMember) => {
        changeFontSize(ctx, '30px');
        ctx.fillText(`Welcome to this server,`, canvas.width / 2.7, canvas.height / 3.5);
    },

    goodbyeText: (ctx: ctx2D, canvas: Canvas, member: GuildMember) => {
        changeFontSize(ctx, '30px');
        ctx.fillText(`Goodbye,`, canvas.width / 2.7, canvas.height / 3.5);
    },

    userText: (ctx: ctx2D, canvas: Canvas, member: GuildMember) => {
        changeFontSize(ctx, getFontSize(member.user.tag) + 'px');
        ctx.fillText(`${member.user.tag}!`, canvas.width / 2.7, canvas.height / 1.8);
    },

    memberCount: (ctx: ctx2D, canvas: Canvas, member: GuildMember) => {
        changeFontSize(ctx, '25px');
        ctx.fillText(`MemberCount: ${member.guild.memberCount}`, canvas.width / 2.7, canvas.height / 1.3);
    },

    avatarImg: async (ctx: ctx2D, canvas: Canvas, member: GuildMember) => {
        ctx.lineWidth = 6
        ctx.beginPath();
        ctx.arc(canvas.height / 2, canvas.height / 2, canvas.height / 2.5, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(await loadImage(member.user.displayAvatarURL({ format: 'png' })), 25, 25, 200, 200)
    }
}

export type ModuleFunction = (ctx: ctx2D, canvas: Canvas, member: GuildMember) => any
export type Module = (keyof typeof modules) | (ModuleFunction)


export async function drawCard(member: GuildMember, theme: ThemeType = 'sakura', mods: Module[]): Promise<Buffer> {
    const canvas = createCanvas(700, 250)
    const ctx = canvas.getContext('2d')

    var canvasTheme: Theme,
        background: Image;


    //Parsing the Theme
    if (typeof theme === 'string') {
        //Builtin Theme
        canvasTheme = themes[theme];
        if (!canvasTheme) throw new Error('Invalid theme, use: ' + Object.keys(themes).join(' | '));

        background = await loadImage(canvasTheme.image);
    } else {
        //Custom Theme
        canvasTheme = theme;

        //Invalid Color
        if (!theme.color.match(hexcolor)) throw new Error('Invalid Color provided.')

        //Loading the Background
        try {
            background = await loadImage(theme.image);
        } catch (e) { throw new Error('Invalid Path or Buffer provided.') }
    }



    ctx.drawImage(background, 0, 0)
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = canvasTheme.color;
    ctx.strokeStyle = canvasTheme.color;
    ctx.font = '30px ' + (canvasTheme.font ? canvasTheme.font : 'sans-serif');;

    for (const mod of mods) {
        if (typeof mod === 'string') {
            var func = modules[mod];
            if (!func) throw new Error(`${mod}, is not a valid Module`);
            await func(ctx, canvas, member)
        } else {
            if (typeof mod === 'function') await mod(ctx, canvas, member);
            else throw (new Error(`${mod}, is not a valid Module`));
        }
    }

    return canvas.toBuffer('image/png');
}


export async function welcomeImage(member: GuildMember, theme: ThemeType = 'sakura'): Promise<Buffer> {
    const buff = await drawCard(member, theme, ['welcomeText', 'userText', 'memberCount', 'avatarImg'])
    //const attachment = new MessageAttachment(buff, 'welcome.png')
    return buff;
}


export async function goodbyeImage(member: GuildMember, theme: ThemeType = 'sakura'): Promise<Buffer> {
    const buff = await drawCard(member, theme, ['goodbyeText', 'userText', 'avatarImg'])
    return buff;
}