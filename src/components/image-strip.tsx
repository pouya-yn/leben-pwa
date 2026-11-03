import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { getImages } from "@/data/images";
import type { Lang, Question } from "@/data/questions";
import { theme } from "@/theme";

const GAP = 8;
const PAD = 8;
const COLS = 2;
/** Horizontal padding of the ScrollView content the strip sits in. */
const SCREEN_PADDING = 16;

/**
 * Renders a question's image(s) like the official catalog: for multi-image
 * questions each picture is captioned "Bild N" (or "Picture N") so the
 * options can be matched to the images. Single photos (decorative or
 * "Was zeigt dieses Bild?") render without captions; questions whose image
 * embeds its own numbers (e.g. the map question) are single-image and thus
 * also uncaptioned.
 *
 * Sizes are computed from the window width (minus known paddings) instead
 * of measuring, so the image is laid out at its final size on the first
 * render — iOS downsamples the decode to the first layout size and a
 * later resize would show a blurry upscale.
 */
export function ImageStrip({
  question,
  lang,
}: {
  question: Question;
  lang: Lang;
}) {
  const images = getImages(question.images);
  const { width: windowWidth } = useWindowDimensions();
  if (images.length === 0) return null;

  const multi = images.length > 1;
  const captionPrefix =
    multi && (question.options[0]?.de ?? "").startsWith("Bild")
      ? lang === "de"
        ? "Bild"
        : "Picture"
      : null;

  const inner = Math.max(0, windowWidth - SCREEN_PADDING * 2 - PAD * 2);
  const cellWidth = multi ? (inner - GAP * (COLS - 1)) / COLS : inner;
  const imageHeight = multi ? cellWidth * (4 / 3) : cellWidth * (3 / 4);

  return (
    <View style={[styles.strip, !multi && styles.single]}>
      {images.map((src, i) => (
        <View key={i} style={[styles.cell, { width: cellWidth }]}>
          <Image
            source={src}
            style={{ width: cellWidth, height: imageHeight, borderRadius: 8 }}
            resizeMode="contain"
          />
          {captionPrefix && (
            <Text style={styles.caption}>
              {captionPrefix} {i + 1}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
    padding: PAD,
    backgroundColor: theme.card,
    borderRadius: 12,
  },
  single: {
    justifyContent: "center",
  },
  cell: {
    alignItems: "center",
  },
  caption: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: theme.text,
  },
});
