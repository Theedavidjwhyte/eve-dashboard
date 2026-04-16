import type { AccountMatch } from "@/types"

export const NON_ELEVATE_ACCOUNTS = [
  "BLACK CROFT COFFEE (OBAN) LTD",
  "Charles Wells Limited",
  "Costa Coffee",
  "Drayton Manor Resort Limited",
  "EG ON THE MOVE LIMITED",
  "ETM Group",
  "Hall & Woodhouse (Brewery Tap)",
  "Hf Holidays Ltd",
  "J D Wetherspoon PLC",
  "J.W.LEES and Co. (Brewers) Limited",
  "Kuttlefish Ltd",
  "Nando's Chickenland Ltd (UK)",
  "Scotsman Group PLC",
  "Seven Stars",
  "The Beefy Boys",
  "The Beefy Boys Holdings Limited",
  "The Peach Pub Company Limited",
  "The Woodspeen Restaurant Limited T/A The Star Inn (location 1009)",
  "The Woolpack Inn, Cirrus Inns (designmynight)",
  "Unilever U.k. Holdings Limited",
]

export function isNonElevate(accountName: string): boolean {
  if (!accountName) return false
  const name = accountName.toLowerCase().trim()
  return NON_ELEVATE_ACCOUNTS.some(
    (n) =>
      n.toLowerCase() === name ||
      name.includes(n.toLowerCase()) ||
      n.toLowerCase().includes(name)
  )
}

export function getAccountMatch(
  accountName: string | undefined,
  accountMatchData: AccountMatch[]
): AccountMatch | null {
  if (!accountName) return null
  const name = accountName.toLowerCase().trim()
  const exact = accountMatchData.find((r) => r.a.toLowerCase().trim() === name)
  if (exact) return exact
  const parentMatch = accountMatchData.find(
    (r) => r.p && r.p.toLowerCase().trim() === name
  )
  return parentMatch ?? null
}

/** Default account match reference data */
export const DEFAULT_ACCOUNT_MATCH: AccountMatch[] = [
  { c:"ADM029", o:"Chevonne Souness", a:"Admiral Taverns Ltd", p:"Admiral", e:"ELV101", ea:"Chevonne Souness" },
  { c:"ADM019", o:"Chevonne Souness", a:"Admiral Taverns (Chester) Limited", p:"Admiral", e:"ELV101", ea:"Chevonne Souness" },
  { c:"AFB002", o:"Chevonne Souness", a:"A. F. Blakemore and Son Ltd", p:"AF Blakemore", e:"ELV102", ea:"Chevonne Souness" },
  { c:"ARC016", o:"Chevonne Souness", a:"Arc Inspirations Limited", p:"Arc", e:"ELV104", ea:"Chevonne Souness" },
  { c:"ARC288", o:"Chevonne Souness", a:"Arc Inspirations", p:"Arc", e:"ELV104", ea:"Chevonne Souness" },
  { c:"HEA363", o:"Chevonne Souness", a:"Heartwood Collection", p:"Heartwood", e:"ELV123", ea:"Chevonne Souness" },
  { c:"HEA401", o:"Chevonne Souness", a:"HEARTWOOD PROPCO LIMITED", p:"Heartwood", e:"ELV123", ea:"Chevonne Souness" },
  { c:"BRA200", o:"Chevonne Souness", a:"Brasserie Bar Co Ltd", p:"Heartwood", e:"ELV123", ea:"Chevonne Souness" },
  { c:"HEA367", o:"Chevonne Souness", a:"Heartwood Inns Limited", p:"Heartwood", e:"ELV123", ea:"Chevonne Souness" },
  { c:"HEI001", o:"Chevonne Souness", a:"Heineken UK Limited", p:"Heineken", e:"ELV124", ea:"Chevonne Souness" },
  { c:"LOU002", o:"Chevonne Souness", a:"Loungers Limited", p:"Loungers", e:"ELV131", ea:"Chevonne Souness" },
  { c:"MIT012", o:"Chevonne Souness", a:"Mitchells & Butlers Leisure Retail Limited", p:"MAB", e:"ELV132", ea:"Chevonne Souness" },
  { c:"MAR080", o:"Chevonne Souness", a:"Marston's Plc", p:"Marstons", e:"ELV133", ea:"Chevonne Souness" },
  { c:"PRUK",  o:"Chevonne Souness", a:"Parkdean Resorts Ltd", p:"Parkdean", e:"ELV137", ea:"Chevonne Souness" },
  { c:"PRE174", o:"Chevonne Souness", a:"Prezzo Trading Limited", p:"Prezzo", e:"ELV142", ea:"Chevonne Souness" },
  { c:"WIN255", o:"Chevonne Souness", a:"Wingstop UK Ltd c/o WRI", p:"Wingstop", e:"ELV153", ea:"Chevonne Souness" },
  { c:"AZZ015", o:"Dan Turner", a:"Azzurri Central Limited", p:"Azzurri", e:"ELV106", ea:"Dan Turner" },
  { c:"ZIZ142", o:"Dan Turner", a:"Zizzi Restaurants Limited", p:"Azzurri", e:"ELV106", ea:"Dan Turner" },
  { c:"BOX023", o:"Dan Turner", a:"Boxpark Ltd", p:"Boxpark", e:"ELV109", ea:"Dan Turner" },
  { c:"DIM005", o:"Dan Turner", a:"Di Maggio's Group Limited", p:"Di Maggios", e:"ELV115", ea:"Dan Turner" },
  { c:"FUL105", o:"Dan Turner", a:"Fuller Smith & Turner PLC", p:"Fullers", e:"ELV119", ea:"Dan Turner" },
  { c:"FRA017", o:"Dan Turner", a:"Franco Manca 2 UK Limited", p:"Fulham Shore", e:"ELV118", ea:"Dan Turner" },
  { c:"REA030", o:"Dan Turner", a:"The Real Greek Food Company Limited", p:"Fulham Shore", e:"ELV118", ea:"Dan Turner" },
  { c:"GAI014", o:"Dan Turner", a:"Gail's Limited", p:"Gails", e:"ELV120", ea:"Dan Turner" },
  { c:"LIB020", o:"Dan Turner", a:"The Liberation Group UK Limited", p:"Liberation", e:"ELV129", ea:"Dan Turner" },
  { c:"BEN152", o:"Dan Turner", a:"Benugo Limited", p:"WSH", e:"ELV154", ea:"Dan Turner" },
  { c:"YOU021", o:"Dan Turner", a:"Youth Hostels Association", p:"YHA", e:"ELV155", ea:"Dan Turner" },
  { c:"PHO026", o:"David Whyte", a:"Pho Trading Limited", p:"Arcturus", e:"ELV105", ea:"David Whyte" },
  { c:"MOW001", o:"David Whyte", a:"Mowgli Street Foods", p:"Arcturus", e:"ELV105", ea:"David Whyte" },
  { c:"STO048", o:"David Whyte", a:"Stonegate Pub Company Limited", p:"Stonegate", e:"ELV146", ea:"David Whyte" },
  { c:"YOU020", o:"David Whyte", a:"Young & Co's Brewery Plc", p:"Youngs", e:"ELV156", ea:"David Whyte" },
  { c:"ROY064", o:"James Roberts", a:"Bkuk Group Ltd.", p:"Burger King", e:"ELV111", ea:"James Roberts" },
  { c:"BOP006", o:"James Roberts", a:"Boparan Restaurants Holdings Limited", p:"Boparan", e:"ELV107", ea:"James Roberts" },
  { c:"BOS009", o:"James Roberts", a:"The Boston Tea Party Group Limited", p:"Boston Tea Party", e:"ELV108", ea:"James Roberts" },
  { c:"KAV001", o:"James Roberts", a:"Gordon Ramsay Holdings Limited", p:"Gordon Ramsay", e:"ELV122", ea:"James Roberts" },
  { c:"HOT033", o:"James Roberts", a:"Hotel Chocolat Ltd.", p:"Hotel Chocolat", e:"ELV125", ea:"James Roberts" },
  { c:"ITS012", o:"James Roberts", a:"itsu Ltd", p:"Itsu", e:"ELV127", ea:"James Roberts" },
  { c:"THE173", o:"James Roberts", a:"The Laine Pub Company Limited", p:"Laine", e:"ELV128", ea:"James Roberts" },
  { c:"MIS018", o:"James Roberts", a:"Mission Mars Limited", p:"Mission Mars", e:"ELV135", ea:"James Roberts" },
  { c:"NIG033", o:"James Roberts", a:"Nightcap Limited", p:"Nightcap", e:"ELV136", ea:"James Roberts" },
  { c:"PIZ619", o:"James Roberts", a:"PizzaExpress Ltd", p:"PizzaExpress", e:"ELV139", ea:"James Roberts" },
  { c:"RES019", o:"James Roberts", a:"The Restaurant Group Limited", p:"TRG", e:"ELV149", ea:"James Roberts" },
  { c:"WAG003", o:"James Roberts", a:"Wagamama Limited", p:"TRG", e:"ELV149", ea:"James Roberts" },
  { c:"TUR012", o:"James Roberts", a:"Turtle Bay Hospitality Limited", p:"Turtle Bay", e:"ELV150", ea:"James Roberts" },
  { c:"ARA062", o:"Samantha Backhouse", a:"Aramark (UK) Ltd - CWOA", p:"Aramark", e:"ELV103", ea:"Samantha Backhouse" },
  { c:"BIG166", o:"Samantha Backhouse", a:"The Big Table Group Limited", p:"BTG", e:"ELV110", ea:"Samantha Backhouse" },
  { c:"CAF002", o:"Samantha Backhouse", a:"Caffè Nero Group Ltd", p:"Cafe Nero", e:"ELV112", ea:"Samantha Backhouse" },
  { c:"CHO015", o:"Samantha Backhouse", a:"Chopstix Restaurant Limited", p:"Chopstix", e:"ELV113", ea:"Samantha Backhouse" },
  { c:"DIS023", o:"Samantha Backhouse", a:"Dishoom Ltd", p:"Dishoom", e:"ELV116", ea:"Samantha Backhouse" },
  { c:"UNI791", o:"Samantha Backhouse", a:"United Brands Ltd.", p:"GDK", e:"ELV121", ea:"Samantha Backhouse" },
  { c:"POP068", o:"Samantha Backhouse", a:"PLK Chicken Ltd", p:"Popeyes", e:"ELV140", ea:"Samantha Backhouse" },
  { c:"RHU001", o:"Samantha Backhouse", a:"Rhubarb Food Design Limited", p:"Rhubarb", e:"ELV143", ea:"Samantha Backhouse" },
  { c:"VAR020", o:"Samantha Backhouse", a:"Various Eateries Trading Limited", p:"Various Eateries", e:"ELV151", ea:"Samantha Backhouse" },
  { c:"WAS009", o:"Samantha Backhouse", a:"Wasabi", p:"Wasabi", e:"ELV152", ea:"Samantha Backhouse" },
]
