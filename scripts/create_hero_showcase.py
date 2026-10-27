import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def round_corners(im, radius):
    """Adds rounded corners to an RGBA PIL image."""
    mask = Image.new('L', im.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), im.size], radius=radius, fill=255)
    result = im.copy()
    result.putalpha(mask)
    return result

def add_shadow(im, offset=(0, 20), blur=35, shadow_color=(0, 0, 0, 160)):
    """Creates a realistic soft drop shadow behind an RGBA image."""
    shadow_size = (im.size[0] + blur * 4, im.size[1] + blur * 4)
    shadow = Image.new('RGBA', shadow_size, (0, 0, 0, 0))
    
    # Extract alpha mask from source image
    mask = im.split()[-1]
    
    # Shadow layer
    shadow_layer = Image.new('RGBA', im.size, shadow_color)
    shadow_layer.putalpha(mask)
    
    # Paste with offset onto shadow canvas
    pos_x = blur * 2 + offset[0]
    pos_y = blur * 2 + offset[1]
    shadow.paste(shadow_layer, (pos_x, pos_y), shadow_layer)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    
    # Paste actual image onto shadow
    shadow.paste(im, (blur * 2, blur * 2), im)
    return shadow, blur * 2

def create_hero_showcase():
    base_dir = r"d:\Coding\kasbareng\docs\screenshots"
    desktop_path = os.path.join(base_dir, "desktop-dashboard.png")
    mobile_path = os.path.join(base_dir, "mobile-quick-action.png")
    output_path = os.path.join(base_dir, "kasbareng-hero-showcase.png")

    # 1. Canvas Dimensions
    canvas_w, canvas_h = 1680, 1000
    canvas = Image.new('RGBA', (canvas_w, canvas_h), (11, 17, 32, 255)) # Slate 950 deep navy
    draw = ImageDraw.Draw(canvas)

    # Gradient background / Glow effect
    # Emerald radial glow top-left
    glow_teal = Image.new('RGBA', (700, 700), (0, 0, 0, 0))
    draw_teal = ImageDraw.Draw(glow_teal)
    draw_teal.ellipse([(0, 0), (700, 700)], fill=(16, 185, 129, 35))
    glow_teal = glow_teal.filter(ImageFilter.GaussianBlur(120))
    canvas.paste(glow_teal, (-100, -100), glow_teal)

    # Indigo radial glow bottom-right
    glow_indigo = Image.new('RGBA', (800, 800), (0, 0, 0, 0))
    draw_indigo = ImageDraw.Draw(glow_indigo)
    draw_indigo.ellipse([(0, 0), (800, 800)], fill=(99, 102, 241, 30))
    glow_indigo = glow_indigo.filter(ImageFilter.GaussianBlur(140))
    canvas.paste(glow_indigo, (canvas_w - 600, canvas_h - 600), glow_indigo)

    # Subtle top pill badge
    badge_text = "RESPONSIVE DEMO PREVIEW: DESKTOP & MOBILE PWA"
    badge_w, badge_h = 440, 34
    badge_x = (canvas_w - badge_w) // 2
    badge_y = 35
    draw.rounded_rectangle([(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)], radius=17, fill=(15, 23, 42, 230), outline=(51, 65, 85, 200), width=1)
    
    # Simple dot inside badge
    draw.ellipse([(badge_x + 18, badge_y + 12), (badge_x + 28, badge_y + 22)], fill=(16, 185, 129, 255))
    draw.text((badge_x + 38, badge_y + 10), badge_text, fill=(203, 213, 225, 255))

    # 2. Process Desktop Image
    dt_img = Image.open(desktop_path).convert('RGBA')
    # Target desktop size
    dt_target_w = 1180
    dt_aspect = dt_img.height / dt_img.width
    dt_target_h = int(dt_target_w * dt_aspect)
    dt_resized = dt_img.resize((dt_target_w, dt_target_h), Image.Resampling.LANCZOS)

    # Create browser window frame (title bar + content)
    title_bar_h = 36
    browser_frame = Image.new('RGBA', (dt_target_w, dt_target_h + title_bar_h), (15, 23, 42, 255))
    draw_browser = ImageDraw.Draw(browser_frame)

    # macOS window buttons
    btn_y = 13
    draw_browser.ellipse([(16, btn_y), (26, btn_y + 10)], fill=(239, 68, 68, 255)) # Red
    draw_browser.ellipse([(32, btn_y), (42, btn_y + 10)], fill=(245, 158, 11, 255)) # Yellow
    draw_browser.ellipse([(48, btn_y), (58, btn_y + 10)], fill=(16, 185, 129, 255)) # Green

    # Address bar mockup
    draw_browser.rounded_rectangle([(120, 8), (dt_target_w - 120, 28)], radius=6, fill=(30, 41, 59, 200), outline=(51, 65, 85, 150))
    draw_browser.text((dt_target_w // 2 - 110, 11), "https://kasbareng.id/dashboard", fill=(148, 163, 184, 255))

    # Paste desktop screenshot into browser frame
    browser_frame.paste(dt_resized, (0, title_bar_h))
    browser_rounded = round_corners(browser_frame, radius=18)
    
    # Border stroke around browser frame
    browser_bordered = Image.new('RGBA', browser_rounded.size, (0, 0, 0, 0))
    browser_bordered.paste(browser_rounded, (0, 0))
    draw_stroke = ImageDraw.Draw(browser_bordered)
    draw_stroke.rounded_rectangle([(0, 0), (browser_rounded.width - 1, browser_rounded.height - 1)], radius=18, outline=(71, 85, 105, 180), width=1)

    # Add drop shadow to desktop frame
    dt_with_shadow, dt_pad = add_shadow(browser_bordered, offset=(0, 25), blur=40, shadow_color=(0, 0, 0, 180))
    dt_pos_x = 70
    dt_pos_y = 95 - dt_pad
    canvas.paste(dt_with_shadow, (dt_pos_x, dt_pos_y), dt_with_shadow)

    # 3. Process Mobile Image (iPhone-style mockup)
    mb_img = Image.open(mobile_path).convert('RGBA')
    # Mobile dimensions
    mb_target_w = 340
    mb_aspect = mb_img.height / mb_img.width
    mb_target_h = int(mb_target_w * mb_aspect)
    mb_resized = mb_img.resize((mb_target_w, mb_target_h), Image.Resampling.LANCZOS)

    # Phone Bezel Frame
    bezel = 12
    phone_w = mb_target_w + (bezel * 2)
    phone_h = mb_target_h + (bezel * 2)
    phone_frame = Image.new('RGBA', (phone_w, phone_h), (2, 6, 23, 255)) # Dark slate
    draw_phone = ImageDraw.Draw(phone_frame)

    # Paste mobile screen inside bezel
    mb_rounded_screen = round_corners(mb_resized, radius=24)
    phone_frame.paste(mb_rounded_screen, (bezel, bezel), mb_rounded_screen)

    # Dynamic Island / Speaker notch mockup at top
    notch_w, notch_h = 90, 20
    notch_x = (phone_w - notch_w) // 2
    draw_phone.rounded_rectangle([(notch_x, bezel + 6), (notch_x + notch_w, bezel + 6 + notch_h)], radius=10, fill=(0, 0, 0, 255))

    phone_rounded = round_corners(phone_frame, radius=38)
    
    # Stroke around phone
    phone_bordered = Image.new('RGBA', phone_rounded.size, (0, 0, 0, 0))
    phone_bordered.paste(phone_rounded, (0, 0))
    draw_phone_stroke = ImageDraw.Draw(phone_bordered)
    draw_phone_stroke.rounded_rectangle([(0, 0), (phone_rounded.width - 1, phone_rounded.height - 1)], radius=38, outline=(99, 102, 241, 140), width=2)

    # Add drop shadow to phone
    phone_with_shadow, ph_pad = add_shadow(phone_bordered, offset=(10, 30), blur=45, shadow_color=(0, 0, 0, 220))
    
    # Position mobile on bottom right, overlapping desktop
    phone_pos_x = canvas_w - phone_w - 75 - ph_pad
    phone_pos_y = canvas_h - phone_h - 40 - ph_pad
    canvas.paste(phone_with_shadow, (phone_pos_x, phone_pos_y), phone_with_shadow)

    # 4. Save Final Hero Image
    canvas_rgb = canvas.convert('RGB')
    canvas_rgb.save(output_path, "PNG", quality=95, optimize=True)
    print(f"Successfully generated hero compilation at: {output_path}")

if __name__ == "__main__":
    create_hero_showcase()
