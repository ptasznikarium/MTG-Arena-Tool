/*
global
  $$,
  addCardHover,
  cards,
  cardsDb,
  cardsNew,
  cardSize,
  collectionSortSet,
  collectionSortName,
  collectionSortCmc,
  collectionSortRarity,
  change_background,
  createDivision,
  createSelect,
  get_card_image,
  get_collection_export,
  get_collection_stats,
  get_set_scryfall,
  hideLoadingBars,
  ipc_send,
  orderedColorCodesCommon,
  orderedCardRarities,
  remote,
  setsList,
  Menu,
  MenuItem,
  shell
*/
let collectionPage = 0;
let sortingAlgorithm = "Sort by Set";
let filteredSets;
let filteredMana;
let filteredRarity;
let orderedSets;

const ALL_CARDS = "All cards";
const SINGLETONS = "Singletons (at least one)";
const FULL_SETS = "Full sets (all 4 copies)";

let countMode = ALL_CARDS;

//
function openCollectionTab() {
  filteredSets = [];
  filteredMana = [];
  filteredRarity = [];
  orderedSets = [];
  for (let set in setsList) {
    orderedSets.push(set);
  }

  orderedSets.sort((a, b) => {
    if (a.release < b.release) return 1;
    if (a.release > b.release) return -1;
    return 0;
  });

  hideLoadingBars();
  document.getElementById("ux_1").innerHTML = "";
  let mainDiv = document.getElementById("ux_0");
  mainDiv.innerHTML = "";
  mainDiv.classList.remove("flex_item");

  let div = createDivision(["inventory"]);

  let basicFilters = createDivision(["inventory_filters_basic"]);

  let fll = createDivision(["inventory_flex_half"]);
  let flr = createDivision(["inventory_flex_half"]);

  let fllt = createDivision(["inventory_flex"]);
  let fllb = createDivision(["inventory_flex"]);
  let flrt = createDivision(["inventory_flex"]);
  let flrb = createDivision(["inventory_flex"]);

  let icd = createDivision(["input_container_inventory"]);

  let label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Search";
  icd.appendChild(label);

  let input = document.createElement("input");
  input.id = "query_name";
  input.autocomplete = "off";
  input.type = "search";

  icd.appendChild(input);
  fllt.appendChild(icd);

  input.addEventListener("keydown", function(e) {
    if (e.keyCode == 13) {
      printCollectionPage();
    }
  });

  let searchButton = createDivision(["button_simple", "button_thin"], "Search");
  flrt.appendChild(searchButton);

  let advancedButton = createDivision(
    ["button_simple", "button_thin"],
    "Advanced Filters"
  );
  flrt.appendChild(advancedButton);

  searchButton.addEventListener("click", () => {
    printCollectionPage();
  });

  advancedButton.addEventListener("click", () => {
    expandFilters();
  });

  let sortby = ["Sort by Set", "Sort by Name", "Sort by Rarity", "Sort by CMC"];
  createSelect(
    fllb,
    sortby,
    sortingAlgorithm,
    res => {
      sortingAlgorithm = res;
      printCollectionPage();
    },
    "query_select"
  );

  let exp = createDivision(
    ["button_simple", "button_thin"],
    "Export Collection"
  );
  fllb.appendChild(exp);

  let reset = createDivision(["button_simple", "button_thin"], "Reset");
  flrb.appendChild(reset);

  let stats = createDivision(
    ["button_simple", "button_thin"],
    "Collection Stats"
  );
  flrb.appendChild(stats);

  exp.addEventListener("click", () => {
    exportCollection();
  });

  reset.addEventListener("click", () => {
    resetFilters();
  });

  stats.addEventListener("click", () => {
    printStats();
  });

  fll.appendChild(fllt);
  fll.appendChild(fllb);
  flr.appendChild(flrt);
  flr.appendChild(flrb);
  basicFilters.appendChild(fll);
  basicFilters.appendChild(flr);

  // "ADVANCED" FILTERS
  let filters = createDivision(["inventory_filters"]);

  let flex = createDivision(["inventory_flex_half"]);

  icd = createDivision(["input_container_inventory"]);
  icd.style.paddingBottom = "8px";

  // Type line input
  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "Type line";
  icd.appendChild(label);

  let typeInput = document.createElement("input");
  typeInput.id = "query_type";
  typeInput.autocomplete = "off";
  typeInput.type = "search";

  icd.appendChild(typeInput);
  flex.appendChild(icd);
  filters.appendChild(flex);

  let sets = createDivision(["sets_container"]);

  orderedSets.forEach(set => {
    let setbutton = createDivision(["set_filter", "set_filter_on"]);
    setbutton.style.backgroundImage = `url(../images/sets/${
      setsList[set].code
    }.png)`;
    setbutton.title = set;

    sets.appendChild(setbutton);
    setbutton.addEventListener("click", () => {
      if (!setbutton.classList.toggle("set_filter_on")) {
        filteredSets.push(set);
      } else {
        let n = filteredSets.indexOf(set);
        if (n > -1) {
          filteredSets.splice(n, 1);
        }
      }
    });
  });
  filters.appendChild(sets);

  let manas = createDivision(["sets_container"]);
  let ms = ["w", "u", "b", "r", "g"];
  ms.forEach(function(s, i) {
    let mi = [1, 2, 3, 4, 5];
    let manabutton = createDivision(["mana_filter_search", "mana_filter_on"]);
    manabutton.style.backgroundImage = `url(../images/${s}64.png)`;

    manas.appendChild(manabutton);
    manabutton.addEventListener("click", () => {
      if (!manabutton.classList.toggle("mana_filter_on")) {
        filteredMana.push(mi[i]);
      } else {
        let n = filteredMana.indexOf(mi[i]);
        if (n > -1) {
          filteredMana.splice(n, 1);
        }
      }
    });
  });
  filters.appendChild(manas);

  let rarityFilter = createDivision(["sets_container"]);
  let rarities = [
    {key:"wc_common", display:"Common", rarity:"common"},
    {key:"wc_uncommon", display:"Uncommon", rarity:"uncommon"},
    {key:"wc_rare", display:"Rare", rarity:"rare"},
    {key:"wc_mythic", display:"Mythic Rare", rarity:"mythic"}
  ];
  rarities.forEach(function(r, i) {
    let buttonRarity = createDivision(["rarity_filter_search", "rarity_filter_on"]);
    buttonRarity.style.backgroundImage = `url(../images/${r.key}.png)`;
    buttonRarity.title = r.display;
    buttonRarity.addEventListener("click", () => {
      if (!buttonRarity.classList.toggle("rarity_filter_on")) {
        filteredRarity.push(r.rarity);
      } else {
        let n = filteredRarity.indexOf(r.rarity);
        if (n > -1) {
          filteredRarity.splice(n, 1);
        }
      }
    });
    rarityFilter.appendChild(buttonRarity);
  });
  filters.appendChild(rarityFilter);


  let main_but_cont = createDivision(["main_buttons_container"]);
  let cont = createDivision(["buttons_container"]);

  addCheckboxSearch(
    cont,
    '<div class="icon_search_unowned"></div>Show unowned',
    "query_unown",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="icon_search_incomplete"></div>Incomplete only',
    "query_incomplete",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="icon_search_new"></div>Newly acquired only',
    "query_new",
    false
  );
  addCheckboxSearch(
    cont,
    '<div class="icon_search_multi"></div>Require multicolored',
    "query_multicolor",
    false
  );
  addCheckboxSearch(cont, "Exclude unselected colors", "query_exclude", false);
  main_but_cont.appendChild(cont);

  cont = createDivision(["buttons_container"]);
  icd = createDivision(["input_container_inventory", "auto_width"]);

  label = document.createElement("label");
  label.style.display = "table";
  label.innerHTML = "CMC:";
  icd.appendChild(label);

  let inputCmc = document.createElement("input");
  inputCmc.style.maxWidth = "80px";
  inputCmc.id = "query_cmc";
  inputCmc.autocomplete = "off";
  inputCmc.type = "number";

  icd.appendChild(inputCmc);
  cont.appendChild(icd);

  let checkboxCmcHigher = addCheckboxSearch(
    cont,
    "Higher than",
    "query_cmchigher",
    false,
    true
  );
  addCheckboxSearch(cont, "Equal to", "query_cmcequal", true);
  let checkboxCmcLower = addCheckboxSearch(
    cont,
    "Lower than",
    "query_cmclower",
    false,
    true
  );

  main_but_cont.appendChild(cont);
  filters.appendChild(main_but_cont);

  searchButton = createDivision(["button_simple", "button_thin"], "Search");
  searchButton.style.margin = "24px auto";
  filters.appendChild(searchButton);

  searchButton.addEventListener("click", () => {
    printCollectionPage();
  });

  mainDiv.appendChild(basicFilters);
  mainDiv.appendChild(filters);
  mainDiv.appendChild(div);

  checkboxCmcLower.addEventListener("change", () => {
    if (document.getElementById("query_cmclower").checked == true) {
      document.getElementById("query_cmchigher").checked = false;
    }
  });

  checkboxCmcHigher.addEventListener("change", () => {
    if (document.getElementById("query_cmchigher").checked == true) {
      document.getElementById("query_cmclower").checked = false;
    }
  });

  printCards();
}

//
function addCheckboxSearch(div, label, iid, def, toggle = false) {
  let labelCheck = document.createElement("label");
  labelCheck.classList.add("check_container");
  labelCheck.classList.add("hover_label");
  labelCheck.innerHTML = label;

  let inputCheck = document.createElement("input");
  inputCheck.type = "checkbox";
  inputCheck.id = iid;
  inputCheck.innerHTML = label;
  inputCheck.checked = def;

  let spanCheck = document.createElement("span");
  spanCheck.classList.add("checkmark");
  if (toggle) spanCheck.style.borderRadius = "100%";

  labelCheck.appendChild(inputCheck);
  labelCheck.appendChild(spanCheck);
  div.appendChild(labelCheck);

  return inputCheck;
}

function expandFilters() {
  let mainDiv = document.getElementById("ux_0");
  mainDiv.style.overflow = "hidden";
  setTimeout(() => {
    mainDiv.removeAttribute("style");
  }, 1000);

  let div = $$(".inventory_filters")[0];
  if (div.style.opacity == 1) {
    div.style.height = "0px";
    div.style.opacity = 0;
    $$(".inventory")[0].style.display = "flex";
  } else {
    div.style.height = "calc(100% - 122px)";
    div.style.opacity = 1;
    setTimeout(function() {
      $$(".inventory")[0].style.display = "none";
    }, 200);
  }
}

function resetFilters() {
  filteredSets = [];
  filteredMana = [];
  filteredRarity = [];

  $$(".set_filter").forEach(div => {
    div.classList.remove("set_filter_on");
    div.classList.add("set_filter_on");
  });
  $$(".mana_filter_search").forEach(div => {
    div.classList.remove("mana_filter_on");
    div.classList.add("mana_filter_on");
  });
  $$(".rarity_filter_search").forEach(div => {
    div.classList.remove("rarity_filter_on");
    div.classList.add("rarity_filter_on");
  });

  document.getElementById("query_name").value = "";
  document.getElementById("query_type").value = "";
  document.getElementById("query_unown").checked = false;
  document.getElementById("query_incomplete").checked = false;
  document.getElementById("query_new").checked = false;
  document.getElementById("query_multicolor").checked = false;
  document.getElementById("query_exclude").checked = false;

  document.getElementById("query_cmc").value = "";
  document.getElementById("query_cmclower").checked = false;
  document.getElementById("query_cmcequal").checked = true;
  document.getElementById("query_cmchigher").checked = false;

  printCollectionPage();
}

//
function exportCollection() {
  let list = get_collection_export();
  ipc_send("export_csvtxt", { str: list, name: "collection" });
}

//
function printStats() {
  $(".moving_ux").animate({ left: "-100%" }, 250, "easeInOutCubic");
  let mainDiv = document.getElementById("ux_1");
  mainDiv.innerHTML = "";
  const stats = get_collection_stats();

  let top = createDivision(["decklist_top"]);
  top.appendChild(createDivision(["button", "back"]));
  top.appendChild(createDivision(["deck_name"], "Collection Statistics"));
  top.appendChild(createDivision(["deck_top_colors"]));

  //change_background("", 67574);

  const flex = createDivision(["flex_item"]);
  const mainstats = createDivision(["main_stats"]);

  let completionLabel = document.createElement("label");
  completionLabel.innerHTML = "Sets Completion";
  mainstats.appendChild(completionLabel);

  // Counting Mode Selector
  const countModeDiv = createDivision(["stats_count_div"]);
  const countModeSelect = createSelect(
    countModeDiv,
    [ALL_CARDS, SINGLETONS, FULL_SETS],
    countMode,
    selectedMode => {
      countMode = selectedMode;
      printStats();
    },
    "stats_count_select"
  );
  countModeSelect.style.margin = "12px auto auto auto";
  countModeSelect.style.textAlign = "left";
  mainstats.appendChild(countModeSelect);

  // Complete collection sats
  let rs = renderSetStats(stats.complete, "PW", "Complete collection");
  mainstats.appendChild(rs);

  // each set stats
  orderedSets
    .slice()
    .reverse()
    .forEach(set => {
      let rs = renderSetStats(stats[set], setsList[set].code, set);
      mainstats.appendChild(rs);
    });

  const substats = createDivision(["main_stats", "sub_stats"]);

  flex.appendChild(mainstats);
  flex.appendChild(substats);

  mainDiv.appendChild(top);
  mainDiv.appendChild(flex);

  //
  $$(".back")[0].addEventListener("click", () => {
    change_background("default");
    $(".moving_ux").animate({ left: "0px" }, 250, "easeInOutCubic");
  });
}

//
function renderSetStats(setStats, setIconCode, setName) {
  const setDiv = renderCompletionDiv(
    setStats.all,
    "sets/" + setIconCode + ".png",
    setName
  );

  setDiv.addEventListener("mouseover", () => {
    let span = setDiv
      .getElementsByClassName("stats_set_icon")[0]
      .getElementsByTagName("span")[0];
    span.style.marginLeft = "48px";
    setDiv.style.opacity = 1;
  });
  setDiv.addEventListener("mouseout", () => {
    let span = setDiv
      .getElementsByClassName("stats_set_icon")[0]
      .getElementsByTagName("span")[0];
    span.style.marginLeft = "36px";
    setDiv.style.opacity = 0.7;
  });

  setDiv.addEventListener("click", () => {
    const substats = $$(".sub_stats")[0];
    substats.innerHTML = "";

    let label = document.createElement("label");
    label.innerHTML = setName + " completion";
    substats.appendChild(label);

    let wanted = {};
    let missing = {};
    orderedCardRarities.forEach(rarity => {
      const countStats = setStats[rarity];
      if (countStats.total > 0) {
        const capitalizedRarity =
          rarity[0].toUpperCase() + rarity.slice(1) + "s";
        let compDiv = renderCompletionDiv(
          countStats,
          "wc_" + rarity + ".png",
          capitalizedRarity
        );
        compDiv.style.opacity = 1;
        substats.appendChild(compDiv);
      }
      wanted[rarity] = countStats.wanted;
      missing[rarity] = countStats.total - countStats.owned;
    });

    // If the set has a collationId, it means boosters for it exists
    if (setsList[setName] && setsList[setName].collation) {
      let chanceBoosterHasMythic = 0.125; // assume 1/8 of packs have a mythic
      let chanceBoosterHasRare = 1 - chanceBoosterHasMythic;
      let wantedText =
        "<abbr title='missing copy of a card in a current deck'>wanted</abbr>";

      // chance that the next booster opened contains a rare missing from one of our decks
      let possibleRares = setStats["rare"].unique - setStats["rare"].complete;
      let chanceBoosterRareWanted = (
        (chanceBoosterHasRare * setStats["rare"].uniqueWanted) /
        possibleRares
      ).toLocaleString([], { style: "percent", maximumSignificantDigits: 2 });
      let rareWantedDiv = createDivision(["stats_set_completion"]);
      let rareWantedIcon = createDivision([
        "stats_set_icon",
        "bo_explore_cost"
      ]);
      rareWantedIcon.style.height = "30px";
      let rareWantedSpan = document.createElement("span");
      rareWantedSpan.innerHTML = `<i>~${chanceBoosterRareWanted} chance next booster has ${wantedText} rare.</i>`;
      rareWantedSpan.style.fontSize = "13px";
      rareWantedIcon.appendChild(rareWantedSpan);
      rareWantedDiv.appendChild(rareWantedIcon);
      substats.appendChild(rareWantedDiv);

      // chance that the next booster opened contains a mythic missing from one of our decks
      let possibleMythics =
        setStats["mythic"].unique - setStats["mythic"].complete;
      let chanceBoosterMythicWanted = (
        (chanceBoosterHasMythic * setStats["mythic"].uniqueWanted) /
        possibleMythics
      ).toLocaleString([], { style: "percent", maximumSignificantDigits: 2 });
      let mythicWantedDiv = createDivision(["stats_set_completion"]);
      let mythicWantedIcon = createDivision([
        "stats_set_icon",
        "bo_explore_cost"
      ]);
      mythicWantedIcon.style.height = "30px";
      let mythicWantedSpan = document.createElement("span");
      mythicWantedSpan.innerHTML = `<i>~${chanceBoosterMythicWanted} chance next booster has ${wantedText} mythic.</i>`;
      mythicWantedSpan.style.fontSize = "13px";
      mythicWantedIcon.appendChild(mythicWantedSpan);
      mythicWantedDiv.appendChild(mythicWantedIcon);
      substats.appendChild(mythicWantedDiv);
    }
  });

  return setDiv;
}

//
function renderCompletionDiv(countStats, image, title) {
  let numerator, denominator;
  switch (countMode) {
    case SINGLETONS:
      numerator = countStats.uniqueOwned;
      denominator = countStats.unique;
      break;
    case FULL_SETS:
      numerator = countStats.complete;
      denominator = countStats.unique;
      break;
    default:
    case ALL_CARDS:
      numerator = countStats.owned;
      denominator = countStats.total;
      break;
  }
  const completionRatio = numerator / denominator;

  const completionDiv = createDivision(["stats_set_completion"]);

  let setIcon = createDivision(["stats_set_icon"]);
  setIcon.style.backgroundImage = `url(../images/${image})`;
  let setIconSpan = document.createElement("span");
  setIconSpan.innerHTML = title;
  setIcon.appendChild(setIconSpan);
  completionDiv.appendChild(setIcon);

  const wrapperDiv = createDivision([]);
  const detailsDiv = createDivision(["stats_set_details"]);

  const percentSpan = document.createElement("span");
  percentSpan.innerHTML = completionRatio.toLocaleString([], {
    style: "percent",
    maximumSignificantDigits: 2
  });
  detailsDiv.appendChild(percentSpan);

  const countSpan = document.createElement("span");
  countSpan.innerHTML = numerator + " / " + denominator;
  detailsDiv.appendChild(countSpan);

  const wantedSpan = document.createElement("span");
  wantedSpan.innerHTML =
    countStats.wanted +
    " <abbr title='missing copies of cards in current decks'>wanted cards</abbr>";
  detailsDiv.appendChild(wantedSpan);

  wrapperDiv.appendChild(detailsDiv);
  completionDiv.appendChild(wrapperDiv);

  let setBar = createDivision(["stats_set_bar"]);
  setBar.style.width = Math.round(completionRatio * 100) + "%";

  completionDiv.appendChild(setBar);
  return completionDiv;
}

function sortCollection(alg) {
  sortingAlgorithm = alg;
  printCollectionPage();
}

//
function printCards() {
  let mainDiv = document.getElementById("ux_0");
  mainDiv.style.overflow = "hidden";

  let div = $$(".inventory_filters")[0];
  div.style.height = "0px";
  div.style.opacity = 0;
  $$(".inventory")[0].style.display = "flex";

  div = $$(".inventory")[0];
  div.innerHTML = "";

  let paging = createDivision(["paging_container"]);
  div.appendChild(paging);

  let filterName = document.getElementById("query_name").value.toLowerCase();
  let filterType = document.getElementById("query_type").value.toLowerCase();
  let filterUnown = document.getElementById("query_unown").checked;
  let filterIncomplete = document.getElementById("query_incomplete").checked;
  let filterNew = document.getElementById("query_new");
  let filterMulti = document.getElementById("query_multicolor");
  let filterExclude = document.getElementById("query_exclude");

  let filterCMC = document.getElementById("query_cmc").value;
  let filterCmcLower = document.getElementById("query_cmclower").checked;
  let filterCmcEqual = document.getElementById("query_cmcequal").checked;
  let filterCmcHigher = document.getElementById("query_cmchigher").checked;

  let totalCards = 0;
  let list;
  if (filterUnown) {
    list = cardsDb.getAll();
    delete list.abilities;
    delete list.events;
    delete list.events_format;
    delete list.sets;
    delete list.ranked_events;
    delete list.ok;
  } else {
    list = cards;
  }

  let keysSorted;
  if (sortingAlgorithm == "Sort by Set")
    keysSorted = Object.keys(list).sort(collectionSortSet);
  if (sortingAlgorithm == "Sort by Name")
    keysSorted = Object.keys(list).sort(collectionSortName);
  if (sortingAlgorithm == "Sort by Rarity")
    keysSorted = Object.keys(list).sort(collectionSortRarity);
  if (sortingAlgorithm == "Sort by CMC")
    keysSorted = Object.keys(list).sort(collectionSortCmc);

  cardLoop: for (let n = 0; n < keysSorted.length; n++) {
    let key = keysSorted[n];

    let grpId = key;
    let card = cardsDb.get(grpId);
    let name = card.name.toLowerCase();
    let type = card.type.toLowerCase();
    let rarity = card.rarity;
    let cost = card.cost;
    let cmc = card.cmc;
    let set = card.set;

    if (card.images == undefined) continue;
    if (!card.collectible) continue;

    // Filter name
    let arr;
    arr = filterName.split(" ");
    for (let m = 0; m < arr.length; m++) {
      if (name.indexOf(arr[m]) == -1) {
        continue cardLoop;
      }
    }

    // filter type
    arr = filterType.split(" ");
    for (let t = 0; t < arr.length; t++) {
      if (type.indexOf(arr[t]) == -1) {
        continue cardLoop;
      }
    }

    if (filterIncomplete) {
      let owned = cards[card.id];
      if (owned >= 4) {
        continue;
      }
    }

    if (filterNew.checked && cardsNew[key] == undefined) {
      continue;
    }

    if (filteredSets.length > 0) {
      if (!filteredSets.includes(set)) {
        continue;
      }
    }

    if (filterCMC) {
      if (filterCmcLower && filterCmcEqual) {
        if (cmc > filterCMC) {
          continue;
        }
      } else if (filterCmcHigher && filterCmcEqual) {
        if (cmc < filterCMC) {
          continue;
        }
      } else if (filterCmcLower && !filterCmcEqual) {
        if (cmc >= filterCMC) {
          continue;
        }
      } else if (filterCmcHigher && !filterCmcEqual) {
        if (cmc <= filterCMC) {
          continue;
        }
      } else if (!filterCmcHigher && !filterCmcLower && filterCmcEqual) {
        if (cmc != filterCMC) {
          continue;
        }
      }
    }

    if (filteredRarity.length > 0) {
      if ((rarity == "land" && !filteredRarity.includes("common")) || !filteredRarity.includes(rarity)) {
        doDraw = false;
      }
    }

    if (filterExclude.checked && cost.length == 0) {
      continue;
    } else {
      let s = [];
      let generic = false;
      for (let i = 0; i < cost.length; i++) {
        let m = cost[i];
        for (let j = 0; j < orderedColorCodesCommon.length; j++) {
          let code = orderedColorCodesCommon[j];
          if (m.indexOf(code) !== -1) {
            if (filterExclude.checked && !filteredMana.includes(j + 1)) {
              continue cardLoop;
            }
            s[j + 1] = 1;
          }
        }
        if (parseInt(m) > 0) {
          generic = true;
        }
      }

      let ms = s.reduce((a, b) => a + b, 0);
      if (generic && ms == 0 && filterExclude.checked) {
        continue;
      }
      if (filteredMana.length > 0) {
        let su = 0;
        filteredMana.forEach(function(m) {
          if (s[m] == 1) {
            su++;
          }
        });
        if (su == 0) {
          continue;
        }
      }
      if (filterMulti.checked && ms < 2) {
        continue;
      }
    }

    totalCards++;

    if (
      totalCards < collectionPage * 100 ||
      totalCards > collectionPage * 100 + 99
    ) {
      continue;
    }

    //let dfc = "";

    let cardDiv = createDivision(["inventory_card"]);
    cardDiv.style.width = cardSize + "px";

    let owned = cards[card.id];
    let aquired = cardsNew[card.id];
    for (let i = 0; i < 4; i++) {
      if (aquired && i >= owned - aquired && i < owned) {
        let q = createDivision(["inventory_card_quantity_orange"]);
        q.style.width = cardSize / 4 + "px";
        cardDiv.appendChild(q);
      } else if (i < owned) {
        let q = createDivision(["inventory_card_quantity_green"]);
        q.style.width = cardSize / 4 + "px";
        cardDiv.appendChild(q);
      } else {
        let q = createDivision(["inventory_card_quantity_gray"]);
        q.style.width = cardSize / 4 + "px";
        cardDiv.appendChild(q);
      }
    }

    let img = document.createElement("img");
    img.style.width = cardSize + "px";
    img.classList.add("inventory_card_img");
    img.src = get_card_image(card);

    cardDiv.appendChild(img);

    addCardHover(img, card);

    img.addEventListener("click", () => {
      if (cardsDb.get(grpId).dfc == "SplitHalf") {
        card = cardsDb.get(card.dfcId);
      }
      //let newname = card.name.split(' ').join('-');
      shell.openExternal(
        `https://scryfall.com/card/${get_set_scryfall(card.set)}/${card.cid}/${
          card.name
        }`
      );
    });

    addCardMenu(img, card);

    div.appendChild(cardDiv);
  }

  let paging_bottom = createDivision(["paging_container"]);
  div.appendChild(paging_bottom);
  let but, butClone;
  if (collectionPage <= 0) {
    but = createDivision(["paging_button_disabled"], " < ");
    butClone = but.cloneNode(true);
  } else {
    but = createDivision(["paging_button"], " < ");

    but.addEventListener("click", () => {
      printCollectionPage(collectionPage - 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      printCollectionPage(collectionPage + 1);
    });
  }

  paging.appendChild(but);
  paging_bottom.appendChild(butClone);

  let totalPages = Math.ceil(totalCards / 100);
  for (let n = 0; n < totalPages; n++) {
    but = createDivision(["paging_button"], n + 1);
    if (collectionPage == n) {
      but.classList.add("paging_active");
    }

    let page = n;
    but.addEventListener("click", () => {
      printCollectionPage(page);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      printCollectionPage(page);
    });

    paging.append(but);
    paging_bottom.append(butClone);
  }
  if (collectionPage >= totalPages - 1) {
    but = createDivision(["paging_button_disabled"], " > ");
    butClone = but.cloneNode(true);
  } else {
    but = createDivision(["paging_button"], " > ");
    but.addEventListener("click", () => {
      printCollectionPage(collectionPage + 1);
    });
    butClone = but.cloneNode(true);
    butClone.addEventListener("click", () => {
      printCollectionPage(collectionPage + 1);
    });
  }
  paging.appendChild(but);
  paging_bottom.appendChild(butClone);

  setTimeout(() => {
    mainDiv.removeAttribute("style");
  }, 1000);
}

function addCardMenu(div, card) {
  let arenaCode = `1 ${card.name} (${setsList[card.set].arenacode}) ${
    card.cid
  }`;
  div.addEventListener(
    "contextmenu",
    e => {
      e.preventDefault();
      let menu = new Menu();
      let menuItem = new MenuItem({
        label: "Copy Arena code",
        click: () => {
          remote.clipboard.writeText(arenaCode);
        }
      });
      menu.append(menuItem);
      menu.popup(remote.getCurrentWindow());
    },
    false
  );
}

//
/* eslint-disable */
function printCollectionPage(page = 0) {
  collectionPage = page;
  printCards();
}
/* eslint-enable */

module.exports = {
  openCollectionTab: openCollectionTab
};
