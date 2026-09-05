import { createCanvas, loadImage } from "@napi-rs/canvas";

/**
 * Service to generate a 2x2 grid storefront banner using @napi-rs/canvas
 */
export class CanvasBannerService {
    /**
     * Renders a 4-skin daily storefront banner
     * @param {Array<{name: string, icon: string, price: number, tierColor?: string}>} skins 
     * @returns {Promise<Buffer>} PNG image buffer
     */
    static async generateStoreBanner(skins = []) {
        const canvasWidth = 1200;
        const canvasHeight = 720;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        // Background
        ctx.fillStyle = "#0f1923"; // Valorant Navy-Black
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Header accent bar
        ctx.fillStyle = "#ff4655"; // Valorant signature red
        ctx.fillRect(0, 0, canvasWidth, 6);

        // Grid parameters (2x2 layout)
        const marginX = 25;
        const marginY = 25;
        const gap = 20;
        const cardWidth = (canvasWidth - (marginX * 2) - gap) / 2; // ~565px
        const cardHeight = (canvasHeight - (marginY * 2) - gap) / 2; // ~325px

        const cardPositions = [
            { x: marginX, y: marginY },
            { x: marginX + cardWidth + gap, y: marginY },
            { x: marginX, y: marginY + cardHeight + gap },
            { x: marginX + cardWidth + gap, y: marginY + cardHeight + gap }
        ];

        // Preload skin images in parallel to drastically improve speed
        const skinCards = skins.slice(0, 4);
        const loadedImages = await Promise.all(
            skinCards.map(async (skin) => {
                if (!skin.icon) return null;
                try {
                    return await loadImage(skin.icon);
                } catch (e) {
                    console.warn(`[Canvas] Failed to load skin image for ${skin.name}:`, e.message);
                    return null;
                }
            })
        );

        for (let i = 0; i < skinCards.length; i++) {
            const skin = skinCards[i];
            const pos = cardPositions[i];
            const tierColor = skin.tierColor || "#fa4454";
            const img = loadedImages[i];

            // Card background container
            ctx.fillStyle = "#1b2733";
            ctx.fillRect(pos.x, pos.y, cardWidth, cardHeight);

            // Subtle gradient overlay on card
            const grad = ctx.createLinearGradient(pos.x, pos.y, pos.x + cardWidth, pos.y + cardHeight);
            grad.addColorStop(0, "rgba(255, 255, 255, 0.03)");
            grad.addColorStop(1, "rgba(0, 0, 0, 0.2)");
            ctx.fillStyle = grad;
            ctx.fillRect(pos.x, pos.y, cardWidth, cardHeight);

            // Tier color vertical indicator on the left
            ctx.fillStyle = tierColor;
            ctx.fillRect(pos.x, pos.y, 8, cardHeight);

            // Card border line
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x, pos.y, cardWidth, cardHeight);

            // Draw loaded weapon skin image
            if (img) {
                const maxW = cardWidth - 60;
                const maxH = cardHeight - 110;
                const scale = Math.min(maxW / img.width, maxH / img.height);
                const renderW = img.width * scale;
                const renderH = img.height * scale;

                const renderX = pos.x + (cardWidth - renderW) / 2;
                const renderY = pos.y + 25 + (maxH - renderH) / 2;

                ctx.drawImage(img, renderX, renderY, renderW, renderH);
            }

            // Bottom text area background
            ctx.fillStyle = "rgba(15, 25, 35, 0.75)";
            ctx.fillRect(pos.x + 8, pos.y + cardHeight - 75, cardWidth - 8, 75);

            // Skin Name
            ctx.fillStyle = "#ece8e1";
            ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
            const maxNameWidth = cardWidth - 180;
            let displayName = skin.name || "Unknown Skin";
            if (ctx.measureText(displayName).width > maxNameWidth) {
                while (ctx.measureText(displayName + "...").width > maxNameWidth && displayName.length > 0) {
                    displayName = displayName.slice(0, -1);
                }
                displayName += "...";
            }
            ctx.fillText(displayName, pos.x + 25, pos.y + cardHeight - 40);

            // Price badge
            const priceText = `${(skin.price || 0).toLocaleString()} VP`;
            ctx.fillStyle = "#ff4655";
            ctx.font = "bold 22px 'Segoe UI', Arial, sans-serif";
            const priceWidth = ctx.measureText(priceText).width;
            ctx.fillText(priceText, pos.x + cardWidth - priceWidth - 25, pos.y + cardHeight - 40);
        }

        return canvas.toBuffer("image/png");
    }
}
