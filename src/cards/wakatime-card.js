const Card = require("../common/Card");
const I18n = require("../common/I18n");
const { getStyles } = require("../getStyles");
const { wakatimeCardLocales } = require("../translations");
const { getCardColors, FlexLayout } = require("../common/utils");
const { createProgressNode } = require("../common/createProgressNode");

const noCodingActivityNode = ({ color, text }) => {
  return `
    <text x="25" y="11" class="stat bold" fill="${color}">${text}</text>
  `;
};

const createTextNode = ({
  id,
  label,
  value,
  index,
  percent,
  hideProgress,
  progressBarColor,
  progressBarBackgroundColor,
}) => {
  const staggerDelay = (index + 3) * 150;

  const cardProgress = hideProgress
    ? null
    : createProgressNode({
        x: 110,
        y: 4,
        progress: percent,
        color: progressBarColor,
        width: 220,
        name: label,
        progressBarBackgroundColor,
      });

  return `
    <g class="stagger" style="animation-delay: ${staggerDelay}ms" transform="translate(25, 0)">
      <text class="stat bold" y="12.5">${label}:</text>
      <text 
        class="stat" 
        x="${hideProgress ? 170 : 350}" 
        y="12.5" 
        data-testid="${id}"
      >${value}</text>
      ${cardProgress}
    </g>
  `;
};

const createCompactLangNode = ({ stat, colors,  x, y }) => {
  const { color } = colors[stat.name] || {};

  return `
    <g transform="translate(${x}, ${y})">
      <circle cx="5" cy="6" r="5" fill="${color || "#858585"}" />
      <text data-testid="lang-name" x="15" y="10" class='lang-name'>
        ${stat.name} ${stat.text}
      </text>
    </g>
  `;
};

const createLanguageTextNode = ({ stats, colors, totalSize, x, y }) => {
  return stats.map((stat, index) => {
    if (index % 2 === 0) {
      return createCompactLangNode({
        stat,
        x,
        y: 12.5 * index + y,
        colors,
        totalSize,
        index,
      });
    }
    return createCompactLangNode({
      stat,
      x: 150,
      y: 12.5 + 12.5 * index,
      colors,
      totalSize,
      index,
    });
  });
};

const renderWakatimeCard = (stats = [], options = { hide: [] }) => {
  const {
    hide_title = false,
    hide_border = false,
    line_height = 25,
    title_color,
    icon_color,
    text_color,
    bg_color,
    theme = "default",
    hide_progress,
    custom_title,
    colors,
    card_width,
    layout,
  } = options;

  const i18n = new I18n({
    locale: "en",
    translations: wakatimeCardLocales,
  });

  const lheight = parseInt(line_height, 10);

  const totalStatSize = stats.reduce((acc, curr) => {
    return acc + curr.total_seconds;
  }, 0);

  // returns theme based colors with proper overrides and defaults
  const { titleColor, textColor, iconColor, bgColor } = getCardColors({
    title_color,
    icon_color,
    text_color,
    bg_color,
    theme,
  });

  let height = Math.max(45 + (stats.length + 1) * lheight, 150);
  let width = isNaN(card_width) ? 300 : card_width;

  let finalLayout = "";

  if (layout === "compact") {
    height = 90 + Math.round(stats.length / 2) * 25;

    // progressOffset holds the previous language's width and used to offset the next language
    // so that we can stack them one after another, like this: [--][----][---]
    let progressOffset = 0;
    const compactProgressBar = stats
      .map((stat) => {
        const { color } = colors[stat.name] || {};
        const percentage = (
          (stat.total_seconds / totalStatSize) *
          (width - 50)
        ).toFixed(2);

        const progress =
          percentage < 10 ? parseFloat(percentage) + 10 : percentage;

        const output = `
          <rect
            mask="url(#rect-mask)" 
            data-testid="lang-progress"
            x="${progressOffset}" 
            y="0"
            width="${progress}" 
            height="8"
            fill="${color || "#858585"}"
          />
        `;
        progressOffset += parseFloat(percentage);
        return output;
      })
      .join("");

    finalLayout = `
      <mask id="rect-mask">
        <rect x="0" y="0" width="${
          width - 50
        }" height="8" fill="white" rx="5" />
      </mask>
      ${compactProgressBar}
      ${createLanguageTextNode({
        x: 0,
        y: 25,
        stats,
        totalSize: totalStatSize,
        colors,
      }).join("")}
    `;
  } else {
    finalLayout = FlexLayout({
      items: stats
        ? stats
            .filter((stat) => stat.hours || stat.minutes)
            .map((stat) => {
              const { color } = colors[stat.name] || {};
              return createTextNode({
                id: stat.name,
                label: stat.name,
                value: stat.text,
                percent: stat.percent,
                progressBarColor: color || titleColor,
                progressBarBackgroundColor: "#ededed",
                hideProgress: hide_progress,
              });
            })
        : [
            noCodingActivityNode({
              color: textColor,
              text: i18n.t("wakatimecard.nocodingactivity"),
            }),
          ],
      gap: lheight,
      direction: "column",
    }).join("");
  }

  const cssStyles = getStyles({
    titleColor,
    textColor,
    iconColor,
  });

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: i18n.t("wakatimecard.title"),
    width: 495,
    height,
    colors: {
      titleColor,
      textColor,
      iconColor,
      bgColor,
    },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(
    `
    ${cssStyles}
    .lang-name { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${textColor} }
    `,
  );

  return card.render(`
    <svg x="25" y="0">
      ${finalLayout}
    </svg> 
  `);
};

module.exports = renderWakatimeCard;
exports.createProgressNode = createProgressNode;
