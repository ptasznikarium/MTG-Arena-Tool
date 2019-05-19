/*
global
  createDivision,
  cardsDb,
  addCardHover,
  shell,
  get_wc_missing,
  get_set_scryfall,
*/

const _ = require("lodash");

//
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

const rarities = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3
};

function frameClassName(card) {
  const frame = card ? card.frame.concat().sort() : [];
  if (_.isEqual(frame, [])) return "tile_c";
  if (_.isEqual(frame, [1])) return "tile_w";
  if (_.isEqual(frame, [2])) return "tile_u";
  if (_.isEqual(frame, [3])) return "tile_b";
  if (_.isEqual(frame, [4])) return "tile_r";
  if (_.isEqual(frame, [5])) return "tile_g";
  if (_.isEqual(frame, [1, 2])) return "tile_uw";
  if (_.isEqual(frame, [1, 3])) return "tile_wb";
  if (_.isEqual(frame, [1, 4])) return "tile_wr";
  if (_.isEqual(frame, [1, 5])) return "tile_gw";
  if (_.isEqual(frame, [2, 3])) return "tile_ub";
  if (_.isEqual(frame, [2, 4])) return "tile_ur";
  if (_.isEqual(frame, [2, 5])) return "tile_ug";
  if (_.isEqual(frame, [3, 4])) return "tile_br";
  if (_.isEqual(frame, [3, 5])) return "tile_bg";
  if (_.isEqual(frame, [4, 5])) return "tile_rg";
  if (frame.length > 2) return "tile_multi";
}

function rankingClassName(ranking) {
  switch (ranking) {
    case "A+":
    case "A":
      return "blue";

    case "A-":
    case "B+":
    case "B":
      return "green";

    case "C-":
    case "D+":
    case "D":
      return "orange";

    case "D-":
    case "F":
      return "red";

    default:
      return "white";
  }
}

exports.addCardSeparator = function(str, element) {
  if (element instanceof jQuery) {
    element = element[0];
  }
  element.appendChild(createDivision(["card_tile_separator"], str));
};

exports.addCardTile = function(
  grpId,
  indent,
  quantity,
  element,
  showWildcards = false,
  deck = null,
  isSideboard = false
) {
  if (quantity === 0) return false;

  //
  const cont = createDivision(["card_tile_container", "click-on"]);

  cont.dataset["grpId"] = grpId;
  cont.dataset["id"] = indent;
  cont.dataset["quantity"] = quantity;

  let card = cardsDb.get(grpId);
  let ww, ll;

  if (!isNumber(quantity)) {
    ww = 64;
    ll = 48;

    //
    const col = rankingClassName(quantity);
    cont.appendChild(
      createDivision(["card_tile_odds", col], `<span>${quantity}</span>`)
    );
  } else if (quantity == 9999) {
    ww = 32;
    ll = 17;

    //
    const quantityDiv = createDivision(
      ["card_tile_quantity"],
      `<span>1</span>`
    );
    quantityDiv.style.cssText =
      "color: rgba(255, 255, 255, 0); min-width: 0px; width: 0px;";
    cont.appendChild(quantityDiv);
  } else {
    ww = 64;
    ll = 49;

    //
    const quantityDiv = createDivision(
      ["card_tile_quantity"],
      `<span>${quantity}</span>`
    );
    cont.appendChild(quantityDiv);
  }

  //
  const cardTile = createDivision(["card_tile", frameClassName(card)]);
  cardTile.id = `t${grpId + indent}`;
  cardTile.style.cssText = `min-width: calc(100% - ${ww}px);`;
  // cardTile.style.minWidth = `calc(100% - ${ww}px)`;

  //
  const fl = createDivision(["flex_item"]);
  fl.appendChild(
    createDivision(["card_tile_name"], card ? card.name : "Unknown")
  );
  cardTile.appendChild(fl);

  //
  const fl2 = createDivision(["flex_item"]);
  fl2.style.lineHeight = "26px";

  if (card) {
    let prevc = true;
    const hasSplitCost = card.dfc === "SplitHalf";

    card.cost.forEach(cost => {
      if (hasSplitCost) {
        if (/^(x|\d)+$/.test(cost) && prevc === false) {
          fl2.innerHTML += "//";
        }
        prevc = /^\d+$/.test(cost);
      }
      fl2.appendChild(createDivision(["mana_s16", "flex_end", `mana_${cost}`]));
    });
  }
  cardTile.appendChild(fl2);

  cont.appendChild(cardTile);

  // Glow hover
  const glow = createDivision(["card_tile_glow"]);
  glow.id = `t${grpId + indent}`;
  glow.style.cssText = `min-width: calc(100% - ${ww}px); left: calc(0px - 100% + ${ll}px)`;

  if (card) {
    addCardHover(glow, card);
    glow.addEventListener("mouseenter", () => {
      cardTile.style.marginTop = "0";
    });
    glow.addEventListener("mouseleave", () => {
      cardTile.style.marginTop = "3px";
    });

    glow.addEventListener("click", () => {
      if (card.dfc == "SplitHalf") {
        card = cardsDb.get(card.dfcId);
      }
      shell.openExternal(
        `https://scryfall.com/card/${get_set_scryfall(card.set)}/${card.cid}/${
          card.name
        }`
      );
    });
  }
  cont.appendChild(glow);

  //
  if (showWildcards && deck) {
    if (card && card.type.indexOf("Basic Land") == -1) {
      const missing = get_wc_missing(deck, grpId, isSideboard);
      if (missing > 0) {
        const asasdf = createDivision(["not_owned_sprite"]);
        const xoff = rarities[card.rarity] * -24;
        const yoff = missing * -24;
        asasdf.style.cssText = `background-position: ${xoff}px ${yoff}px; left: calc(0px - 100% + ${ww -
          14}px);`;
        asasdf.title = `${missing} missing`;
        cont.appendChild(asasdf);
      }
    }
  }

  // if element is a jquery object convert to bare DOM element
  // TODO: Remove this once jQuery is removed.
  if (element instanceof jQuery) {
    element = element[0];
  }

  element.appendChild(cont);

  return cont;
};
