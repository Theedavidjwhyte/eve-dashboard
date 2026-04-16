/**
 * ELV Account Mapping
 * Maps account names / codes back to their ELV ID, parent group, and owning AD.
 * Used for Closed/Lost matching and ARR account reconciliation.
 * Source of truth: Universal ELV Account data (updated Apr 2026)
 */

export interface ELVAccount {
  elvId: string
  elvAD: string
  parentAccount: string
  owner: string
  accountName: string
  accountCode: string
  numberOfSites?: number
  cpiPercent?: number
  cpiDate?: string
  elevateCSM?: string
  elevateSAM?: string
}

export const ELV_ACCOUNTS: ELVAccount[] = [
  // ELV101 — Admiral
  { elvId: "ELV101", elvAD: "Chevonne Souness", parentAccount: "Admiral", owner: "Chevonne Souness", accountName: "Admiral Taverns Ltd", accountCode: "ADM029", numberOfSites: 222, cpiPercent: 5 },
  { elvId: "ELV101", elvAD: "Chevonne Souness", parentAccount: "Admiral", owner: "Chevonne Souness", accountName: "Admiral Taverns (Chester) Limited", accountCode: "ADM019" },
  // ELV102 — AF Blakemore
  { elvId: "ELV102", elvAD: "Chevonne Souness", parentAccount: "AF Blakemore", owner: "Chevonne Souness", accountName: "A. F. Blakemore and Son Ltd", accountCode: "AFB002", numberOfSites: 250, cpiPercent: 5, cpiDate: "08/01/2026" },
  // ELV103 — Aramark
  { elvId: "ELV103", elvAD: "Samantha Backhouse", parentAccount: "Aramark", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - CWOA", accountCode: "ARA062", numberOfSites: 160, cpiPercent: 4 },
  { elvId: "ELV103", elvAD: "Samantha Backhouse", parentAccount: "Aramark", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - Windsor", accountCode: "ARA064" },
  // ELV104 — Arc
  { elvId: "ELV104", elvAD: "Chevonne Souness", parentAccount: "Arc", owner: "Chevonne Souness", accountName: "Arc Inspirations Limited", accountCode: "ARC016", numberOfSites: 18, cpiPercent: 4, cpiDate: "31/10/2026" },
  { elvId: "ELV104", elvAD: "Chevonne Souness", parentAccount: "Arc", owner: "Chevonne Souness", accountName: "Arc Inspirations", accountCode: "ARC288" },
  // ELV105 — Arcturus
  { elvId: "ELV105", elvAD: "David Whyte", parentAccount: "Arcturus", owner: "David Whyte", accountName: "Pho Trading Limited", accountCode: "PHO026", numberOfSites: 122, cpiPercent: 5, cpiDate: "10/10/2026" },
  { elvId: "ELV105", elvAD: "David Whyte", parentAccount: "Arcturus", owner: "David Whyte", accountName: "Mowgli Street Foods", accountCode: "MOW001" },
  { elvId: "ELV105", elvAD: "David Whyte", parentAccount: "Arcturus", owner: "David Whyte", accountName: "Rosas London Ltd", accountCode: "ROS142" },
  // ELV106 — Azzurri
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Azzurri Central Limited", accountCode: "AZZ015", numberOfSites: 230, cpiPercent: 5, cpiDate: "28/06/2026" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Ask Italian Restaurants Limited", accountCode: "ASK003" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "AZZURRI GROUP HOLDINGS UK LIMITED", accountCode: "ZIZ282" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Zizzi Restaurants Limited", accountCode: "ZIZ142" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Azzurri Group", accountCode: "AZZ008" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Ask Italian Restaurants Limited", accountCode: "ASK164" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Azzurri Restaurants Ireland Limited", accountCode: "AZZ018" },
  // ELV107 — Boparan
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan Restaurants Holdings Limited", accountCode: "BOP006", numberOfSites: 112, cpiPercent: 5, cpiDate: "31/03/2027" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "KCHICKEN LTD", accountCode: "KCH004" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan Ventures Ltd", accountCode: "BOP005" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Giraffe Concepts Limited", accountCode: "GIR006" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "JRK Restaurants Ltd", accountCode: "JRK001" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan - Brg Star Limited", accountCode: "BOP052" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan - Gourmet Burger Kitchen ltd", accountCode: "BOP054" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan - Giraffe Concepts Limited", accountCode: "BOP051" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Kk Restaurants Sw Limited", accountCode: "KKR001" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan - Carluccios ROI", accountCode: "BOP053" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Cinnamon Collection Limited", accountCode: "BOP003" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Gourmet Burger Kitchen (UK) Limited", accountCode: "GOU166" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan - BRG Concessions Limited", accountCode: "BOP057" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan - Cinnamon Collection", accountCode: "BOP055" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan Restaurants Holdings", accountCode: "BOP056" },
  // ELV108 — Boston Tea Party
  { elvId: "ELV108", elvAD: "James Roberts", parentAccount: "Boston Tea Party", owner: "James Roberts", accountName: "The Boston Tea Party Group Limited", accountCode: "BOS009", numberOfSites: 22, cpiPercent: 7, cpiDate: "12/11/2026" },
  // ELV109 — Boxpark
  { elvId: "ELV109", elvAD: "Dan Turner", parentAccount: "Boxpark", owner: "Dan Turner", accountName: "Boxpark Ltd", accountCode: "BOX023", numberOfSites: 5, cpiPercent: 4, cpiDate: "30/08/2026" },
  { elvId: "ELV109", elvAD: "Dan Turner", parentAccount: "Boxpark", owner: "Dan Turner", accountName: "Boxpark Trading Ltd", accountCode: "BOX013" },
  // ELV110 — Big Table Group
  { elvId: "ELV110", elvAD: "Samantha Backhouse", parentAccount: "Big Table Group", owner: "Samantha Backhouse", accountName: "Big Table Group", accountCode: "BIG167", numberOfSites: 185, cpiPercent: 5, cpiDate: "01/01/2026" },
  { elvId: "ELV110", elvAD: "Samantha Backhouse", parentAccount: "Big Table Group", owner: "Samantha Backhouse", accountName: "Fuller Smith & Turner P.L.C.", accountCode: "FUL498" },
  { elvId: "ELV110", elvAD: "Samantha Backhouse", parentAccount: "Big Table Group", owner: "Samantha Backhouse", accountName: "The Big Table Group Limited", accountCode: "BIG166" },
  // ELV111 — Burger King
  { elvId: "ELV111", elvAD: "James Roberts", parentAccount: "Burger King", owner: "James Roberts", accountName: "Bkuk Group Ltd.", accountCode: "ROY064", numberOfSites: 530, cpiPercent: 5 },
  // ELV112 — Cafe Nero
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal St Technology", accountCode: "NEA043", numberOfSites: 620, cpiPercent: 7 },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "200 Degrees", accountCode: "DEG003" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal Street Technology - Compass - ESS", accountCode: "NEA041" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal Street Technology - Caffe Nero UK", accountCode: "NEA031" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Caffe Nero Group Ltd", accountCode: "CAF002" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal Street Technology - Caffe Nero - US", accountCode: "NEA034" },
  // ELV113 — Chopstix
  { elvId: "ELV113", elvAD: "Samantha Backhouse", parentAccount: "Chopstix", owner: "Samantha Backhouse", accountName: "Chopstix Restaurant Limited", accountCode: "CHO015", numberOfSites: 150, cpiPercent: 7, cpiDate: "29/09/2026" },
  { elvId: "ELV113", elvAD: "Samantha Backhouse", parentAccount: "Chopstix", owner: "Samantha Backhouse", accountName: "KK Foods SW Limited", accountCode: "KKF002" },
  // ELV115 — Di Maggios
  { elvId: "ELV115", elvAD: "Dan Turner", parentAccount: "Di Maggios", owner: "Dan Turner", accountName: "Di Maggio's Group Limited", accountCode: "DIM005", numberOfSites: 30, cpiPercent: 5, cpiDate: "30/10/2026" },
  { elvId: "ELV115", elvAD: "Dan Turner", parentAccount: "Di Maggios", owner: "Dan Turner", accountName: "CHMD Limited", accountCode: "CHM002" },
  { elvId: "ELV115", elvAD: "Dan Turner", parentAccount: "Di Maggios", owner: "Dan Turner", accountName: "Di Maggio's Restaurant Group", accountCode: "DIM006" },
  // ELV116 — Dishoom
  { elvId: "ELV116", elvAD: "Samantha Backhouse", parentAccount: "Dishoom", owner: "Samantha Backhouse", accountName: "Dishoom Ltd", accountCode: "DIS023", numberOfSites: 17, cpiPercent: 5, cpiDate: "30/09/2025" },
  // ELV118 — Fulham Shore
  { elvId: "ELV118", elvAD: "Dan Turner", parentAccount: "Fulham Shore", owner: "Dan Turner", accountName: "Franco Manca 2 UK Limited", accountCode: "FRA017", numberOfSites: 320, cpiPercent: 5, cpiDate: "31/03/2026" },
  { elvId: "ELV118", elvAD: "Dan Turner", parentAccount: "Fulham Shore", owner: "Dan Turner", accountName: "The Real Greek Food Company Limited", accountCode: "REA030" },
  // ELV119 — Fullers
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "Fuller Smith & Turner PLC", accountCode: "FUL105", numberOfSites: 180, cpiPercent: 5, cpiDate: "23/08/2026" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "LONDZA RESTAURANTS LIMITED", accountCode: "LON578" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "PARKER PUBCO LIMITED", accountCode: "PAR731" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "THE LONDON STYLE PIZZA COMPANY LIMITED", accountCode: "LON587" },
  // ELV120 — Gails
  { elvId: "ELV120", elvAD: "Dan Turner", parentAccount: "Gails", owner: "Dan Turner", accountName: "Gail's Limited", accountCode: "GAI014", numberOfSites: 150, cpiPercent: 3, cpiDate: "01/01/2027" },
  // ELV121 — GDK
  { elvId: "ELV121", elvAD: "Samantha Backhouse", parentAccount: "GDK", owner: "Samantha Backhouse", accountName: "United Brands Ltd.", accountCode: "UNI791", numberOfSites: 130, cpiPercent: 5, cpiDate: "01/07/2026" },
  // ELV122 — Gordon Ramsay
  { elvId: "ELV122", elvAD: "James Roberts", parentAccount: "Gordon Ramsay", owner: "James Roberts", accountName: "Gordon Ramsay Holdings Limited", accountCode: "KAV001", numberOfSites: 60, cpiPercent: 5, cpiDate: "30/10/2026" },
  { elvId: "ELV122", elvAD: "James Roberts", parentAccount: "Gordon Ramsay", owner: "James Roberts", accountName: "UPPER BROOK STREET LIMITED", accountCode: "UPP038" },
  // ELV123 — Heartwood
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Collection", accountCode: "HEA363", numberOfSites: 49, cpiPercent: 4, cpiDate: "01/06/2026" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "HEARTWOOD PROPCO LIMITED", accountCode: "HEA401" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Brasserie Bar Co Ltd", accountCode: "BRA200" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "The George and Dragon", accountCode: "GEO263" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Inns Limited", accountCode: "HEA367" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "The Potters Heron", accountCode: "POT074" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Collection Limited", accountCode: "BRA041" },
  // ELV124 — Heineken
  { elvId: "ELV124", elvAD: "Dan Turner", parentAccount: "Heineken", owner: "Dan Turner", accountName: "Heineken UK Limited", accountCode: "HEI001", numberOfSites: 60, cpiPercent: 5, cpiDate: "01/12/2026" },
  // ELV125 — Hotel Chocolat
  { elvId: "ELV125", elvAD: "James Roberts", parentAccount: "Hotel Chocolat", owner: "James Roberts", accountName: "Hotel Chocolat Ltd.", accountCode: "HOT033", numberOfSites: 130, cpiPercent: 5, cpiDate: "05/01/2026" },
  // ELV126 — Hotel Co 51 UK
  { elvId: "ELV126", elvAD: "Samantha Backhouse", parentAccount: "Hotel Co 51 UK", owner: "Samantha Backhouse", accountName: "Hotel Co 51 UK LImited", accountCode: "ROO044", numberOfSites: 35, cpiPercent: 7 },
  // ELV127 — Itsu
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "SAVVI DINING GROUP LIMITED", accountCode: "SAV039", numberOfSites: 85, cpiPercent: 4 },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "itsu Ltd", accountCode: "ITS012" },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "ITS IVI LTD", accountCode: "ITS197" },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "Itsu grocery Ltd", accountCode: "ITS101" },
  // ELV128 — Laine
  { elvId: "ELV128", elvAD: "James Roberts", parentAccount: "Laine", owner: "James Roberts", accountName: "The Laine Pub Company Limited", accountCode: "THE173", numberOfSites: 50, cpiPercent: 7, cpiDate: "31/08/2026" },
  { elvId: "ELV128", elvAD: "James Roberts", parentAccount: "Laine", owner: "James Roberts", accountName: "Itsu Ltd", accountCode: "ITS193" },
  // ELV129 — Liberation
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "Butcombe Brewery Limited", accountCode: "BUT008", numberOfSites: 90, cpiPercent: 5, cpiDate: "01/01/2027" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "The Liberation Group UK Limited", accountCode: "LIB020" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "DAQIAN HOTEL MANAGEMENT LTD", accountCode: "DAQ001" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "Liberation Group - Guernsey", accountCode: "LIB080" },
  // ELV130 — London Clubs
  { elvId: "ELV130", elvAD: "James Roberts", parentAccount: "London Clubs", owner: "James Roberts", accountName: "London Clubs International Limited", accountCode: "CAE007", numberOfSites: 25, cpiPercent: 7, cpiDate: "01/02/2027" },
  // ELV131 — Loungers
  { elvId: "ELV131", elvAD: "Chevonne Souness", parentAccount: "Loungers", owner: "Chevonne Souness", accountName: "Loungers Limited", accountCode: "LOU002", numberOfSites: 230, cpiPercent: 5, cpiDate: "26/02/2027" },
  // ELV132 — MAB
  { elvId: "ELV132", elvAD: "Chevonne Souness", parentAccount: "MAB", owner: "Chevonne Souness", accountName: "Mitchells & Butlers Leisure Retail Limited", accountCode: "MIT012", numberOfSites: 1700, cpiPercent: 5, cpiDate: "01/10/2026" },
  { elvId: "ELV132", elvAD: "Chevonne Souness", parentAccount: "MAB", owner: "Chevonne Souness", accountName: "Pesto Restaurants Ltd", accountCode: "PES008" },
  // ELV133 — Marstons
  { elvId: "ELV133", elvAD: "Chevonne Souness", parentAccount: "Marstons", owner: "Chevonne Souness", accountName: "Marston's Plc", accountCode: "MAR080", numberOfSites: 700, cpiPercent: 3, cpiDate: "01/10/2026" },
  // ELV134 — Merlin
  { elvId: "ELV134", elvAD: "Samantha Backhouse", parentAccount: "Merlin", owner: "Samantha Backhouse", accountName: "Legoland Billund #1", accountCode: "LEG088", numberOfSites: 130, cpiPercent: 7 },
  { elvId: "ELV134", elvAD: "Samantha Backhouse", parentAccount: "Merlin", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - Thorpe Park", accountCode: "ARA063" },
  { elvId: "ELV134", elvAD: "Samantha Backhouse", parentAccount: "Merlin", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - Alton Towers - 1903618", accountCode: "ARA061" },
  // ELV135 — Mission Mars
  { elvId: "ELV135", elvAD: "James Roberts", parentAccount: "Mission Mars", owner: "James Roberts", accountName: "Mission Mars Limited", accountCode: "MIS018", numberOfSites: 60, cpiPercent: 5, cpiDate: "22/01/2027" },
  { elvId: "ELV135", elvAD: "James Roberts", parentAccount: "Mission Mars", owner: "James Roberts", accountName: "Mission Mars", accountCode: "MIS010" },
  // ELV136 — Nightcap
  { elvId: "ELV136", elvAD: "James Roberts", parentAccount: "Nightcap", owner: "James Roberts", accountName: "Barrio East Ltd", accountCode: "BAR088", numberOfSites: 45, cpiPercent: 3, cpiDate: "29/11/2027" },
  { elvId: "ELV136", elvAD: "James Roberts", parentAccount: "Nightcap", owner: "James Roberts", accountName: "Nightcap Limited", accountCode: "NIG033" },
  // ELV137 — Parkdean
  { elvId: "ELV137", elvAD: "Chevonne Souness", parentAccount: "Parkdean", owner: "Chevonne Souness", accountName: "Parkdean Resorts Ltd", accountCode: "PRUK", numberOfSites: 65, cpiPercent: 5, cpiDate: "01/11/2025" },
  // ELV139 — PizzaExpress
  { elvId: "ELV139", elvAD: "James Roberts", parentAccount: "PizzaExpress", owner: "James Roberts", accountName: "PizzaExpress Ltd", accountCode: "PIZ619", numberOfSites: 360, cpiPercent: 7, cpiDate: "21/08/2026" },
  { elvId: "ELV139", elvAD: "James Roberts", parentAccount: "PizzaExpress", owner: "James Roberts", accountName: "Redcentric Solutions Limited", accountCode: "RED579" },
  // ELV140 — Popeyes
  { elvId: "ELV140", elvAD: "Samantha Backhouse", parentAccount: "Popeyes", owner: "Samantha Backhouse", accountName: "PLK Chicken Ltd", accountCode: "POP068", numberOfSites: 80, cpiPercent: 5, cpiDate: "01/06/2025" },
  { elvId: "ELV140", elvAD: "Samantha Backhouse", parentAccount: "Popeyes", owner: "Samantha Backhouse", accountName: "PLK Chicken UK Ltd", accountCode: "PLK001" },
  // ELV141 — Postech
  { elvId: "ELV141", elvAD: "Samantha Backhouse", parentAccount: "Postech", owner: "Samantha Backhouse", accountName: "Postech Ltd", accountCode: "POS086", numberOfSites: 1, cpiPercent: 6 },
  // ELV142 — Prezzo
  { elvId: "ELV142", elvAD: "Chevonne Souness", parentAccount: "Prezzo", owner: "Chevonne Souness", accountName: "Prezzo Trading Limited", accountCode: "PRE174", numberOfSites: 150, cpiPercent: 7, cpiDate: "01/09/2026" },
  // ELV143 — Rhubarb
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "RHC MANCHESTER LIMITED", accountCode: "RHC001", numberOfSites: 20, cpiPercent: 4 },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "Rhubarb Food Design Limited", accountCode: "RHU001" },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "Rhubarb Food and Design Ltd", accountCode: "RHU002" },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "Eastlands VenueServicesLtd", accountCode: "EAS447" },
  // ELV144 — Stable Bars
  { elvId: "ELV144", elvAD: "James Roberts", parentAccount: "Stable Bars", owner: "James Roberts", accountName: "The Stable Bar & Restaurants Limited", accountCode: "THE218", numberOfSites: 35, cpiPercent: 5, cpiDate: "29/05/2026" },
  // ELV145 — Starbucks
  { elvId: "ELV145", elvAD: "James Roberts", parentAccount: "Starbucks", owner: "James Roberts", accountName: "23.5 Degrees Ltd", accountCode: "DEG002", numberOfSites: 1200, cpiPercent: 5, cpiDate: "01/04/2026" },
  { elvId: "ELV145", elvAD: "James Roberts", parentAccount: "Starbucks", owner: "James Roberts", accountName: "STARBUCKS COFFEE COMPANY (UK) LIMITED", accountCode: "ST0262" },
  // ELV146 — Stonegate
  { elvId: "ELV146", elvAD: "David Whyte", parentAccount: "Stonegate", owner: "David Whyte", accountName: "Stonegate Pub Company Limited", accountCode: "STO048", numberOfSites: 1100, cpiPercent: 7, cpiDate: "02/10/2026" },
  // ELV149 — TRG
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "The Restaurant Group Limited", accountCode: "RES019", numberOfSites: 400, cpiPercent: 7, cpiDate: "01/04/2026" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Brunning And Price Limited", accountCode: "BRU064" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Wagamama Limited", accountCode: "WAG003" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Trg (holdings) Limited", accountCode: "TRG003" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Wagamama International (Franchising) Limited", accountCode: "WAG021" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "TRG Concessions Limited", accountCode: "TRG002" },
  // ELV150 — Turtle Bay
  { elvId: "ELV150", elvAD: "James Roberts", parentAccount: "Turtle Bay", owner: "James Roberts", accountName: "Turtle Bay Hospitality Limited", accountCode: "TUR012", numberOfSites: 50, cpiPercent: 5, cpiDate: "02/05/2025" },
  // ELV151 — Various Eateries
  { elvId: "ELV151", elvAD: "Samantha Backhouse", parentAccount: "Various Eateries", owner: "Samantha Backhouse", accountName: "Various Eateries Trading Limited", accountCode: "VAR020", numberOfSites: 23, cpiPercent: 7, cpiDate: "26/10/2026" },
  { elvId: "ELV151", elvAD: "Samantha Backhouse", parentAccount: "Various Eateries", owner: "Samantha Backhouse", accountName: "Various Eateries PLC", accountCode: "VAR027" },
  // ELV152 — Wasabi
  { elvId: "ELV152", elvAD: "Samantha Backhouse", parentAccount: "Wasabi", owner: "Samantha Backhouse", accountName: "Wasabi", accountCode: "WAS009", numberOfSites: 70, cpiPercent: 5, cpiDate: "01/07/2026" },
  // ELV153 — Wingstop
  { elvId: "ELV153", elvAD: "Chevonne Souness", parentAccount: "Wingstop", owner: "Chevonne Souness", accountName: "Wingstop UK Ltd c/o WRI", accountCode: "WIN255", numberOfSites: 80, cpiPercent: 7, cpiDate: "01/07/2026" },
  { elvId: "ELV153", elvAD: "Chevonne Souness", parentAccount: "Wingstop", owner: "Chevonne Souness", accountName: "LEMON PEPPER HOLDINGS LIMITED T/A Wingstop UK", accountCode: "LEM009" },
  { elvId: "ELV153", elvAD: "Chevonne Souness", parentAccount: "Wingstop", owner: "Chevonne Souness", accountName: "Wingstop Restaurants Inc. A Texas Corp", accountCode: "WIN567" },
  // ELV154 — WSH
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo Limited", accountCode: "BEN152", numberOfSites: 3500, cpiPercent: 5, cpiDate: "22/01/2027" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo - John Lewis Drummond Gate", accountCode: "BEN469" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "WSH RESTAURANTS LIMITED", accountCode: "WSH007" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Baxter Storey", accountCode: "BAX006" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Malch Ltd T/A The Clockspire", accountCode: "MAL041" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo-British Museum", accountCode: "BEN042" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo-Deloitte 1 New Street Square", accountCode: "BEN320" },
  // ELV155 — YHA
  { elvId: "ELV155", elvAD: "Dan Turner", parentAccount: "YHA", owner: "Dan Turner", accountName: "Youth Hostels Association", accountCode: "YOU021", numberOfSites: 150, cpiPercent: 5, cpiDate: "12/08/2026" },
  { elvId: "ELV155", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "BaxterStorey Limited", accountCode: "BAX031" },
  // ELV156 — Youngs
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Young & Co's Brewery Plc", accountCode: "YOU020", numberOfSites: 270, cpiPercent: 4, cpiDate: "30/06/2026" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Market House", accountCode: "MAR938" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Cliftonville Hotel", accountCode: "CLI160" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Westgate", accountCode: "WES601" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Teller's Arms", accountCode: "YOU314" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Alexander Pope", accountCode: "ALE136" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Aragon House", accountCode: "ARA049" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Bedford Arms", accountCode: "BED055" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Brewers Inn", accountCode: "BRE693" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Brook Green", accountCode: "BRO506" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Bulls Head", accountCode: "BUL133" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Coach & Horses", accountCode: "COA183" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Crown Hotel", accountCode: "CRO541" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Dukes Head", accountCode: "DUK084" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Dunstan House", accountCode: "DUN159" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Fox & Anchor", accountCode: "FOX155" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Georgian Townhouse", accountCode: "GEO246" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Hand & Spear", accountCode: "HAN240" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Hort's Townhouse", accountCode: "HOR156" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "No. 38 The Park", accountCode: "NO3009" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Red Lion", accountCode: "RED592" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Rose & Crown", accountCode: "ROS408" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Seagate", accountCode: "SEA266" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Spread Eagle", accountCode: "SPR165" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Alma", accountCode: "ALM077" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Bear", accountCode: "BEA377" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Bell", accountCode: "BEL473" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Bridge", accountCode: "BRI871" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Bridge Barnes", accountCode: "BRI873" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Bull", accountCode: "BUL096" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Canford", accountCode: "CAN229" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Foley", accountCode: "FOL042" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The George", accountCode: "GEO214" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Greyhound", accountCode: "GRE777" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Hoste Arms", accountCode: "HOS072" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Huntsman Brockenhurst", accountCode: "HUN146" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Lamb", accountCode: "LAM099" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Orange Tree", accountCode: "ORA076" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Park", accountCode: "PAR679" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Red Lion", accountCode: "RED593" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Station", accountCode: "STA907" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Waterman", accountCode: "WAT258" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Wheatsheaf Inn", accountCode: "WHE069" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The White Hart", accountCode: "WHI493" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The White Lion", accountCode: "WHI492" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Youngs & Co.s Brewery P.L.C.", accountCode: "YOU301" },
  // ELV157 — D&D (was #N/A — now corrected)
  { elvId: "ELV157", elvAD: "Samantha Backhouse", parentAccount: "D&D", owner: "Samantha Backhouse", accountName: "D&D London Ltd", accountCode: "D&D001", numberOfSites: 45, cpiPercent: 6, cpiDate: "21/05/2026" },
]

// ── Unique parent accounts (for dropdown) ────────────────────────────────────
export const UNIQUE_ELV_PARENTS: { elvId: string; parentAccount: string; elvAD: string }[] = 
  Array.from(
    new Map(
      ELV_ACCOUNTS.map((a) => [a.elvId, { elvId: a.elvId, parentAccount: a.parentAccount, elvAD: a.elvAD }])
    ).values()
  ).sort((a, b) => a.elvId.localeCompare(b.elvId))

// ── Lookup helpers ────────────────────────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

const _LOOKUP = new Map<string, ELVAccount>()
for (const acct of ELV_ACCOUNTS) {
  _LOOKUP.set(norm(acct.accountName), acct)
  if (acct.accountCode) _LOOKUP.set(norm(acct.accountCode), acct)
}

export function lookupELVAccount(accountName: string): ELVAccount | null {
  if (!accountName) return null
  const key = norm(accountName)
  if (_LOOKUP.has(key)) return _LOOKUP.get(key)!
  for (const [k, v] of _LOOKUP) {
    if (k.includes(key) || key.includes(k)) return v
  }
  return null
}

export function getELVParentGroups(): string[] {
  const groups = new Set(ELV_ACCOUNTS.map(a => a.parentAccount))
  return Array.from(groups).sort()
}
