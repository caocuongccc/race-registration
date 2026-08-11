import path from "path";
import { readFileSync } from "fs";
import sharp from "sharp";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const opentype: any = require("opentype.js");

const montserratFontPath = path.resolve(
  process.cwd(),
  "public",
  "fonts",
  "montserrat",
  "Montserrat-Variable.ttf",
);
const montserratFontBuffer = readFileSync(montserratFontPath);
const montserratFont = opentype.parse(
  montserratFontBuffer.buffer.slice(
    montserratFontBuffer.byteOffset,
    montserratFontBuffer.byteOffset + montserratFontBuffer.byteLength,
  ),
);

type BibCategory = {
  bibTemplateUrl?: string | null;
  bibTextColor?: string | null;
  bibNumberFontSize?: number | null;
  bibNameFontSize?: number | null;
};

type BibParticipant = {
  id: string;
  fullName: string;
  bibNumber?: string | null;
  category: BibCategory;
};

function resolveTemplate(templateUrl: string) {
  const templateRoot = path.resolve(process.cwd(), "public", "template");
  const filePath = path.resolve(
    process.cwd(),
    "public",
    templateUrl.replace(/^\/+/, ""),
  );
  if (!filePath.startsWith(templateRoot + path.sep)) {
    throw new Error("Đường dẫn template BIB không hợp lệ");
  }
  return filePath;
}

export async function generateKidRunBibImage(participant: BibParticipant) {
  if (!participant.bibNumber) throw new Error("Participant chưa có số BIB");
  const templateUrl = participant.category.bibTemplateUrl;
  if (!templateUrl) throw new Error("Nhóm tuổi chưa có template BIB");

  const configuredColor = participant.category.bibTextColor || "#0f4e1e";
  const color = /^#[0-9a-f]{6}$/i.test(configuredColor)
    ? configuredColor
    : "#0f4e1e";
  const bibFontSize = participant.category.bibNumberFontSize || 245;
  const nameFontSize = participant.category.bibNameFontSize || 42;
  const bibNumber = participant.bibNumber;
  const fullName = participant.fullName.trim().toLocaleUpperCase("vi-VN");
  const renderTextPath = (
    text: string,
    fontSize: number,
    fontWeight: number,
    centerY: number,
  ) => {
    montserratFont.variation?.set({ wght: fontWeight });
    const initialPath = montserratFont.getPath(text, 0, 0, fontSize);
    const bounds = initialPath.getBoundingBox();
    const x = 600 - (bounds.x1 + bounds.x2) / 2;
    const y = centerY - (bounds.y1 + bounds.y2) / 2;
    return montserratFont.getPath(text, x, y, fontSize).toPathData({
      decimalPlaces: 2,
      optimize: true,
      flipY: false,
    });
  };

  const bibPath = renderTextPath(bibNumber, bibFontSize, 800, 475);
  const namePath = renderTextPath(fullName, nameFontSize, 700, 610);
  const overlay = Buffer.from(`
    <svg width="1200" height="846" xmlns="http://www.w3.org/2000/svg">
      <path d="${bibPath}" fill="${color}" />
      <path d="${namePath}" fill="${color}" />
    </svg>
  `);

  return sharp(resolveTemplate(templateUrl))
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export async function generateKidRunBibDataUrl(participant: BibParticipant) {
  const buffer = await generateKidRunBibImage(participant);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function generateKidRunBibAttachments(
  participants: BibParticipant[],
) {
  return Promise.all(
    participants
      .filter(
        (participant) =>
          participant.bibNumber && participant.category.bibTemplateUrl,
      )
      .map(async (participant) => {
        const buffer = await generateKidRunBibImage(participant);
        return {
          filename: `bib-${participant.bibNumber}-${participant.id}.png`,
          content: buffer.toString("base64"),
          encoding: "base64",
          cid: `kidbib-${participant.id}`,
          contentType: "image/png",
        };
      }),
  );
}
