import path from "path";
import sharp from "sharp";

const montserratFontPath = path.resolve(
  process.cwd(),
  "public",
  "fonts",
  "montserrat",
  "Montserrat-Variable.ttf",
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

  const configuredColor = participant.category.bibTextColor || "#0f4e1e";
  const color = /^#[0-9a-f]{6}$/i.test(configuredColor)
    ? configuredColor
    : "#0f4e1e";
  const bibFontSize = participant.category.bibNumberFontSize || 245;
  const nameFontSize = participant.category.bibNameFontSize || 42;
  const bibNumber = escapeXml(participant.bibNumber);
  const fullName = escapeXml(participant.fullName.trim().toLocaleUpperCase("vi-VN"));
  const renderText = async (
    text: string,
    fontSize: number,
    fontWeight: number,
    centerY: number,
  ) => {
    const { data, info } = await sharp({
      text: {
        text: `<span foreground="${color}" font_weight="${fontWeight}">${text}</span>`,
        font: `Montserrat ${fontSize}`,
        fontfile: montserratFontPath,
        width: 1100,
        align: "center",
        rgba: true,
        dpi: 72,
      },
    })
      .png()
      .toBuffer({ resolveWithObject: true });

    return {
      input: data,
      left: Math.round((1200 - info.width) / 2),
      top: Math.round(centerY - info.height / 2),
    };
  };

  const overlays = await Promise.all([
    renderText(bibNumber, bibFontSize, 800, 475),
    renderText(fullName, nameFontSize, 700, 610),
  ]);

  return sharp(resolveTemplate(templateUrl))
    .composite(overlays)
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
