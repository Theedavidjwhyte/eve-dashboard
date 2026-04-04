/**
 * ELV Account Mapping
 * Maps account names / codes back to their ELV ID, parent group, and owning AD.
 * Used for Closed/Lost matching and ARR account reconciliation.
 */

export interface ELVAccount {
  elvId: string
  elvAD: string
  parentAccount: string
  owner: string
  accountName: string
  accountCode: string
}

export const ELV_ACCOUNTS: ELVAccount[] = [
  { elvId: "ELV101", elvAD: "Chevonne Souness", parentAccount: "Admiral", owner: "Chevonne Souness", accountName: "Admiral Taverns Ltd", accountCode: "ADM029" },
  { elvId: "ELV101", elvAD: "Chevonne Souness", parentAccount: "Admiral", owner: "Chevonne Souness", accountName: "Admiral Taverns (Chester) Limited", accountCode: "ADM019" },
  { elvId: "ELV102", elvAD: "Chevonne Souness", parentAccount: "AF Blakemore", owner: "Chevonne Souness", accountName: "A. F. Blakemore and Son Ltd", accountCode: "AFB002" },
  { elvId: "ELV103", elvAD: "Samantha Backhouse", parentAccount: "Aramark", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - CWOA", accountCode: "ARA062" },
  { elvId: "ELV103", elvAD: "Samantha Backhouse", parentAccount: "Aramark", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - Windsor", accountCode: "ARA064" },
  { elvId: "ELV104", elvAD: "Chevonne Souness", parentAccount: "Arc", owner: "Chevonne Souness", accountName: "Arc Inspirations Limited", accountCode: "ARC016" },
  { elvId: "ELV104", elvAD: "Chevonne Souness", parentAccount: "Arc", owner: "Chevonne Souness", accountName: "Arc Inspirations", accountCode: "ARC288" },
  { elvId: "ELV105", elvAD: "David Whyte", parentAccount: "Arcturus", owner: "David Whyte", accountName: "Pho Trading Limited", accountCode: "PHO026" },
  { elvId: "ELV105", elvAD: "David Whyte", parentAccount: "Arcturus", owner: "David Whyte", accountName: "Mowgli Street Foods", accountCode: "MOW001" },
  { elvId: "ELV105", elvAD: "David Whyte", parentAccount: "Arcturus", owner: "David Whyte", accountName: "Rosas London Ltd", accountCode: "ROS142" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Azzurri Central Limited", accountCode: "AZZ015" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Ask Italian Restaurants Limited", accountCode: "ASK003" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "AZZURRI GROUP HOLDINGS UK LIMITED", accountCode: "ZIZ282" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Zizzi Restaurants Limited", accountCode: "ZIZ142" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Azzurri Group", accountCode: "AZZ008" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Ask Italian Restaurants Limited", accountCode: "ASK164" },
  { elvId: "ELV106", elvAD: "Dan Turner", parentAccount: "Azzurri", owner: "Dan Turner", accountName: "Azzurri Restaurants Ireland Limited", accountCode: "AZZ018" },
  { elvId: "ELV110", elvAD: "Samantha Backhouse", parentAccount: "Big Table Group", owner: "Samantha Backhouse", accountName: "Big Table Group", accountCode: "BIG167" },
  { elvId: "ELV110", elvAD: "Samantha Backhouse", parentAccount: "Big Table Group", owner: "Samantha Backhouse", accountName: "Fuller Smith & Turner P.L.C.", accountCode: "FUL498" },
  { elvId: "ELV110", elvAD: "Samantha Backhouse", parentAccount: "Big Table Group", owner: "Samantha Backhouse", accountName: "The Big Table Group Limited", accountCode: "BIG166" },
  { elvId: "ELV107", elvAD: "James Roberts", parentAccount: "Boparan", owner: "James Roberts", accountName: "Boparan Restaurants Holdings Limited", accountCode: "BOP006" },
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
  { elvId: "ELV108", elvAD: "James Roberts", parentAccount: "Boston Tea Party", owner: "James Roberts", accountName: "The Boston Tea Party Group Limited", accountCode: "BOS009" },
  { elvId: "ELV109", elvAD: "Dan Turner", parentAccount: "Boxpark", owner: "Dan Turner", accountName: "Boxpark Ltd", accountCode: "BOX023" },
  { elvId: "ELV109", elvAD: "Dan Turner", parentAccount: "Boxpark", owner: "Dan Turner", accountName: "Boxpark Trading Ltd", accountCode: "BOX013" },
  { elvId: "ELV111", elvAD: "James Roberts", parentAccount: "Burger King", owner: "James Roberts", accountName: "Bkuk Group Ltd.", accountCode: "ROY064" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal St Technology", accountCode: "NEA043" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "200 Degrees", accountCode: "DEG003" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal Street Technology - Compass - ESS", accountCode: "NEA041" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal Street Technology - Caffe Nero UK", accountCode: "NEA031" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Caffe Nero Group Ltd", accountCode: "CAF002" },
  { elvId: "ELV112", elvAD: "Samantha Backhouse", parentAccount: "Cafe Nero", owner: "Samantha Backhouse", accountName: "Neal Street Technology - Caffe Nero - US", accountCode: "NEA034" },
  { elvId: "ELV113", elvAD: "Samantha Backhouse", parentAccount: "Chopstix", owner: "Samantha Backhouse", accountName: "Chopstix Restaurant Limited", accountCode: "CHO015" },
  { elvId: "ELV113", elvAD: "Samantha Backhouse", parentAccount: "Chopstix", owner: "Samantha Backhouse", accountName: "KK Foods SW Limited", accountCode: "KKF002" },
  { elvId: "#N/A", elvAD: "Samantha Backhouse", parentAccount: "D&D", owner: "Samantha Backhouse", accountName: "D&D London Ltd", accountCode: "D&D001" },
  { elvId: "ELV115", elvAD: "Dan Turner", parentAccount: "Di Maggios", owner: "Dan Turner", accountName: "Di Maggio's Group Limited", accountCode: "DIM005" },
  { elvId: "ELV115", elvAD: "Dan Turner", parentAccount: "Di Maggios", owner: "Dan Turner", accountName: "CHMD Limited", accountCode: "CHM002" },
  { elvId: "ELV115", elvAD: "Dan Turner", parentAccount: "Di Maggios", owner: "Dan Turner", accountName: "Di Maggio's Restaurant Group", accountCode: "DIM006" },
  { elvId: "ELV116", elvAD: "Samantha Backhouse", parentAccount: "Dishoom", owner: "Samantha Backhouse", accountName: "Dishoom Ltd", accountCode: "DIS023" },
  { elvId: "ELV118", elvAD: "Dan Turner", parentAccount: "Fulham Shore", owner: "Dan Turner", accountName: "Franco Manca 2 UK Limited", accountCode: "FRA017" },
  { elvId: "ELV118", elvAD: "Dan Turner", parentAccount: "Fulham Shore", owner: "Dan Turner", accountName: "The Real Greek Food Company Limited", accountCode: "REA030" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "Fuller Smith & Turner PLC", accountCode: "FUL105" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "LONDZA RESTAURANTS LIMITED", accountCode: "LON578" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "PARKER PUBCO LIMITED", accountCode: "PAR731" },
  { elvId: "ELV119", elvAD: "Dan Turner", parentAccount: "Fullers", owner: "Dan Turner", accountName: "THE LONDON STYLE PIZZA COMPANY LIMITED", accountCode: "LON587" },
  { elvId: "ELV120", elvAD: "Dan Turner", parentAccount: "Gails", owner: "Dan Turner", accountName: "Gail's Limited", accountCode: "GAI014" },
  { elvId: "ELV121", elvAD: "Samantha Backhouse", parentAccount: "GDK", owner: "Samantha Backhouse", accountName: "United Brands Ltd.", accountCode: "UNI791" },
  { elvId: "ELV122", elvAD: "James Roberts", parentAccount: "Gordon Ramsay", owner: "James Roberts", accountName: "Gordon Ramsay Holdings Limited", accountCode: "KAV001" },
  { elvId: "ELV122", elvAD: "James Roberts", parentAccount: "Gordon Ramsay", owner: "James Roberts", accountName: "UPPER BROOK STREET LIMITED", accountCode: "UPP038" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Collection", accountCode: "HEA363" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "HEARTWOOD PROPCO LIMITED", accountCode: "HEA401" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Brasserie Bar Co Ltd", accountCode: "BRA200" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "The George and Dragon", accountCode: "GEO263" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Inns Limited", accountCode: "HEA367" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "The Potters Heron", accountCode: "POT074" },
  { elvId: "ELV123", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Collection Limited", accountCode: "BRA041" },
  { elvId: "ELV124", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Inns Limited", accountCode: "HEA369" },
  { elvId: "ELV125", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Inns Limited", accountCode: "HEA368" },
  { elvId: "ELV126", elvAD: "Chevonne Souness", parentAccount: "Heartwood", owner: "Chevonne Souness", accountName: "Heartwood Inns Limited", accountCode: "RAG018" },
  { elvId: "ELV124", elvAD: "Dan Turner", parentAccount: "Heineken", owner: "Dan Turner", accountName: "Heineken UK Limited", accountCode: "HEI001" },
  { elvId: "ELV125", elvAD: "James Roberts", parentAccount: "Hotel Chocolat", owner: "James Roberts", accountName: "Hotel Chocolat Ltd.", accountCode: "HOT033" },
  { elvId: "ELV126", elvAD: "Samantha Backhouse", parentAccount: "Hotel Co 51 UK", owner: "Samantha Backhouse", accountName: "Hotel Co 51 UK LImited", accountCode: "ROO044" },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "SAVVI DINING GROUP LIMITED", accountCode: "SAV039" },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "itsu Ltd", accountCode: "ITS012" },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "ITS IVI LTD", accountCode: "ITS197" },
  { elvId: "ELV127", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "Itsu grocery Ltd", accountCode: "ITS101" },
  { elvId: "ELV128", elvAD: "James Roberts", parentAccount: "Itsu", owner: "James Roberts", accountName: "Itsu Ltd", accountCode: "ITS193" },
  { elvId: "ELV128", elvAD: "James Roberts", parentAccount: "Laine", owner: "James Roberts", accountName: "The Laine Pub Company Limited", accountCode: "THE173" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "Butcombe Brewery Limited", accountCode: "BUT008" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "The Liberation Group UK Limited", accountCode: "LIB020" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "DAQIAN HOTEL MANAGEMENT LTD", accountCode: "DAQ001" },
  { elvId: "ELV129", elvAD: "Dan Turner", parentAccount: "Liberation", owner: "Dan Turner", accountName: "Liberation Group - Guernsey", accountCode: "LIB080" },
  { elvId: "ELV130", elvAD: "James Roberts", parentAccount: "London Clubs", owner: "James Roberts", accountName: "London Clubs International Limited", accountCode: "CAE007" },
  { elvId: "ELV131", elvAD: "Chevonne Souness", parentAccount: "Loungers", owner: "Chevonne Souness", accountName: "Loungers Limited", accountCode: "LOU002" },
  { elvId: "ELV132", elvAD: "Chevonne Souness", parentAccount: "MAB", owner: "Chevonne Souness", accountName: "Mitchells & Butlers Leisure Retail Limited", accountCode: "MIT012" },
  { elvId: "ELV132", elvAD: "Chevonne Souness", parentAccount: "MAB", owner: "Chevonne Souness", accountName: "Pesto Restaurants Ltd", accountCode: "PES008" },
  { elvId: "ELV133", elvAD: "Chevonne Souness", parentAccount: "Marstons", owner: "Chevonne Souness", accountName: "Marston's Plc", accountCode: "MAR080" },
  { elvId: "ELV134", elvAD: "Samantha Backhouse", parentAccount: "Merlin", owner: "Samantha Backhouse", accountName: "Legoland Billund #1", accountCode: "LEG088" },
  { elvId: "ELV134", elvAD: "Samantha Backhouse", parentAccount: "Merlin", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - Thorpe Park", accountCode: "ARA063" },
  { elvId: "ELV134", elvAD: "Samantha Backhouse", parentAccount: "Merlin", owner: "Samantha Backhouse", accountName: "Aramark (UK) Ltd - Alton Towers - 1903618", accountCode: "ARA061" },
  { elvId: "ELV135", elvAD: "James Roberts", parentAccount: "Mission Mars", owner: "James Roberts", accountName: "Mission Mars Limited", accountCode: "MIS018" },
  { elvId: "ELV135", elvAD: "James Roberts", parentAccount: "Mission Mars", owner: "James Roberts", accountName: "Mission Mars", accountCode: "MIS010" },
  { elvId: "ELV136", elvAD: "James Roberts", parentAccount: "Nightcap", owner: "James Roberts", accountName: "Barrio East Ltd", accountCode: "BAR088" },
  { elvId: "ELV136", elvAD: "James Roberts", parentAccount: "Nightcap", owner: "James Roberts", accountName: "Nightcap Limited", accountCode: "NIG033" },
  { elvId: "ELV137", elvAD: "Chevonne Souness", parentAccount: "Parkdean", owner: "Chevonne Souness", accountName: "Parkdean Resorts Ltd", accountCode: "PRUK" },
  { elvId: "ELV139", elvAD: "James Roberts", parentAccount: "PizzaExpress", owner: "James Roberts", accountName: "PizzaExpress Ltd", accountCode: "PIZ619" },
  { elvId: "ELV139", elvAD: "James Roberts", parentAccount: "PizzaExpress", owner: "James Roberts", accountName: "Redcentric Solutions Limited", accountCode: "RED579" },
  { elvId: "ELV140", elvAD: "Samantha Backhouse", parentAccount: "Popeyes", owner: "Samantha Backhouse", accountName: "PLK Chicken Ltd", accountCode: "POP068" },
  { elvId: "ELV140", elvAD: "Samantha Backhouse", parentAccount: "Popeyes", owner: "Samantha Backhouse", accountName: "PLK Chicken UK Ltd", accountCode: "PLK001" },
  { elvId: "ELV141", elvAD: "Samantha Backhouse", parentAccount: "Postech", owner: "Samantha Backhouse", accountName: "Postech Ltd", accountCode: "POS086" },
  { elvId: "ELV142", elvAD: "Chevonne Souness", parentAccount: "Prezzo", owner: "Chevonne Souness", accountName: "Prezzo Trading Limited", accountCode: "PRE174" },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "RHC MANCHESTER LIMITED", accountCode: "RHC001" },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "Rhubarb Food Design Limited", accountCode: "RHU001" },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "Rhubarb Food and Design Ltd", accountCode: "RHU002" },
  { elvId: "ELV143", elvAD: "Samantha Backhouse", parentAccount: "Rhubarb", owner: "Samantha Backhouse", accountName: "Eastlands VenueServicesLtd", accountCode: "EAS447" },
  { elvId: "ELV144", elvAD: "James Roberts", parentAccount: "Stable Bars", owner: "James Roberts", accountName: "The Stable Bar & Restaurants Limited", accountCode: "THE218" },
  { elvId: "ELV145", elvAD: "James Roberts", parentAccount: "Starbucks", owner: "James Roberts", accountName: "23.5 Degrees Ltd", accountCode: "DEG002" },
  { elvId: "ELV145", elvAD: "James Roberts", parentAccount: "Starbucks", owner: "James Roberts", accountName: "STARBUCKS COFFEE COMPANY (UK) LIMITED", accountCode: "ST0262" },
  { elvId: "ELV146", elvAD: "David Whyte", parentAccount: "Stonegate", owner: "David Whyte", accountName: "Stonegate Pub Company Limited", accountCode: "STO048" },
  { elvId: "#N/A", elvAD: "Samantha Backhouse", parentAccount: "TGI", owner: "Samantha Backhouse", accountName: "TGI Fridays UK", accountCode: "TGI025" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "The Restaurant Group Limited", accountCode: "RES019" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Brunning And Price Limited", accountCode: "BRU064" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Wagamama Limited", accountCode: "WAG003" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Trg (holdings) Limited", accountCode: "TRG003" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "Wagamama International (Franchising) Limited", accountCode: "WAG021" },
  { elvId: "ELV149", elvAD: "James Roberts", parentAccount: "TRG", owner: "James Roberts", accountName: "TRG Concessions Limited", accountCode: "TRG002" },
  { elvId: "ELV150", elvAD: "James Roberts", parentAccount: "Turtle Bay", owner: "James Roberts", accountName: "Turtle Bay Hospitality Limited", accountCode: "TUR012" },
  { elvId: "ELV151", elvAD: "Samantha Backhouse", parentAccount: "Various Eateries", owner: "Samantha Backhouse", accountName: "Various Eateries Trading Limited", accountCode: "VAR020" },
  { elvId: "ELV151", elvAD: "Samantha Backhouse", parentAccount: "Various Eateries", owner: "Samantha Backhouse", accountName: "Various Eateries PLC", accountCode: "VAR027" },
  { elvId: "ELV152", elvAD: "Samantha Backhouse", parentAccount: "Wasabi", owner: "Samantha Backhouse", accountName: "Wasabi", accountCode: "WAS009" },
  { elvId: "ELV153", elvAD: "Chevonne Souness", parentAccount: "Wingstop", owner: "Chevonne Souness", accountName: "Wingstop UK Ltd c/o WRI", accountCode: "WIN255" },
  { elvId: "ELV153", elvAD: "Chevonne Souness", parentAccount: "Wingstop", owner: "Chevonne Souness", accountName: "LEMON PEPPER HOLDINGS LIMITED T/A Wingstop UK", accountCode: "LEM009" },
  { elvId: "ELV153", elvAD: "Chevonne Souness", parentAccount: "Wingstop", owner: "Chevonne Souness", accountName: "Wingstop Restaurants Inc. A Texas Corp", accountCode: "WIN567" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo Limited", accountCode: "BEN152" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo - John Lewis Drummond Gate", accountCode: "BEN469" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "WSH RESTAURANTS LIMITED", accountCode: "WSH007" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Baxter Storey", accountCode: "BAX006" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Malch Ltd T/A The Clockspire", accountCode: "MAL041" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo-British Museum", accountCode: "BEN042" },
  { elvId: "ELV154", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "Benugo-Deloitte 1 New Street Square", accountCode: "BEN320" },
  { elvId: "ELV155", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "BaxterStorey Limited", accountCode: "BAX031" },
  { elvId: "ELV156", elvAD: "Dan Turner", parentAccount: "WSH", owner: "Dan Turner", accountName: "WSH GROUP LIMITED", accountCode: "WSH005" },
  { elvId: "ELV155", elvAD: "Dan Turner", parentAccount: "YHA", owner: "Dan Turner", accountName: "Youth Hostels Association", accountCode: "YOU021" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Market House", accountCode: "MAR938" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Cliftonville Hotel", accountCode: "CLI160" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Westgate", accountCode: "WES601" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "The Teller's Arms", accountCode: "YOU314" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Young & Co's Brewery Plc", accountCode: "YOU020" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Alexander Pope", accountCode: "ALE136" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Aragon House", accountCode: "ARA049" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Bedford Arms", accountCode: "BED055" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Brewers Inn", accountCode: "BRE693" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Brook Green", accountCode: "BRO506" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Bulls Head", accountCode: "BUL133" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Carnarvon Arms", accountCode: "CA0138" },
  { elvId: "ELV156", elvAD: "David Whyte", parentAccount: "Youngs", owner: "David Whyte", accountName: "Carpenters Arms Hotel", accountCode: "CA0092" },
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
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Normalise string for fuzzy matching */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Pre-build a lookup map keyed by normalised account name
const _LOOKUP = new Map<string, ELVAccount>()
for (const acct of ELV_ACCOUNTS) {
  _LOOKUP.set(norm(acct.accountName), acct)
  // Also index by account code
  if (acct.accountCode) _LOOKUP.set(norm(acct.accountCode), acct)
}

/**
 * Look up an account by name (exact then fuzzy).
 * Returns the matching ELVAccount or null.
 */
export function lookupELVAccount(accountName: string): ELVAccount | null {
  if (!accountName) return null
  const key = norm(accountName)
  // Exact match
  if (_LOOKUP.has(key)) return _LOOKUP.get(key)!
  // Partial match — find first entry where the key starts with the search or vice versa
  for (const [k, v] of _LOOKUP) {
    if (k.includes(key) || key.includes(k)) return v
  }
  return null
}

/**
 * Get all unique parent groups, sorted alphabetically.
 */
export function getELVParentGroups(): string[] {
  const groups = new Set(ELV_ACCOUNTS.map(a => a.parentAccount))
  return Array.from(groups).sort()
}
