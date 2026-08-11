import path from "path";
import { readFileSync } from "fs";
import sharp from "sharp";

const montserratFont = readFileSync(
  path.resolve(
    process.cwd(),
    "public",
    "fonts",
    "montserrat",
    "Montserrat-Variable.ttf",
  ),
).toString("base64");

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

  const color = participant.category.bibTextColor || "#0f4e1e";
  const bibFontSize = participant.category.bibNumberFontSize || 245;
  const nameFontSize = participant.category.bibNameFontSize || 42;
  const bibNumber = escapeXml(participant.bibNumber);
  const fullName = escapeXml(participant.fullName.trim().toLocaleUpperCase("vi-VN"));
  const overlay = Buffer.from(`
    <svg width="1200" height="846" xmlns="http://www.w3.org/2000/svg">
      <style>
        @font-face { font-family: MontserratBib; src: url("data:font/ttf;base64,${montserratFont}") format("truetype"); font-weight: 100 900; }
        .bib { font-family: MontserratBib, Arial, DejaVu Sans, sans-serif; font-size: ${bibFontSize}px; font-weight: 800; }
        .name { font-family: MontserratBib, Arial, DejaVu Sans, sans-serif; font-size: ${nameFontSize}px; font-weight: 700; letter-spacing: 1px; }
      </style>
      <text x="600" y="475" text-anchor="middle" dominant-baseline="middle" fill="${color}" class="bib">${bibNumber}</text>
      <text x="600" y="610" text-anchor="middle" dominant-baseline="middle" fill="${color}" class="name">${fullName}</text>
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
      .filter((participant) => participant.bibNumber && participant.category.bibTemplateUrl)
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
