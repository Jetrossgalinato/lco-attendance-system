export type Member = {
  id: string
  name: string
  department: string
  college: string
  organization: string
}

const DEPARTMENTS = [
  "Worship",
  "Youth",
  "Media",
  "Ushering",
  "Children",
  "Tech",
] as const

const COLLEGES = ["CCIS", "COFES", "CED", "CMNS", "CEGS"] as const

const ORGANIZATIONS = [
  "LCO Core",
  "Youth Fellowship",
  "Media Team",
  "Usher Corps",
  "Children Ministry",
  "Tech Crew",
] as const

const FIRST_NAMES = [
  "Ana",
  "Ben",
  "Carla",
  "Diego",
  "Elena",
  "Felix",
  "Gina",
  "Hiro",
  "Isabel",
  "Jonas",
  "Kai",
  "Lara",
  "Marco",
  "Nina",
  "Omar",
  "Paula",
  "Quinn",
  "Rafael",
  "Sofia",
  "Theo",
  "Uma",
  "Victor",
  "Wendy",
  "Xander",
  "Yana",
  "Zeke",
  "Alya",
  "Bruno",
  "Celine",
  "Dante",
  "Eliza",
  "Farah",
  "Gio",
  "Hana",
  "Ivan",
  "Jade",
  "Ken",
  "Lina",
  "Miguel",
  "Nora",
  "Owen",
  "Pia",
  "Rico",
  "Sam",
  "Tessa",
  "Uri",
  "Vera",
  "Will",
]

const LAST_NAMES = [
  "Reyes",
  "Santos",
  "Mendoza",
  "Cruz",
  "Garcia",
  "Ramos",
  "Lopez",
  "Tanaka",
  "Navarro",
  "Lim",
  "Domingo",
  "Villanueva",
  "Dela Cruz",
  "Ortega",
  "Bautista",
  "Castillo",
  "Fernandez",
  "Gonzales",
  "Hernandez",
  "Ibarra",
  "Jimenez",
  "Kwan",
  "Luna",
  "Morales",
  "Nunez",
  "Ocampo",
  "Pascual",
  "Quijano",
  "Rivera",
  "Salazar",
  "Torres",
  "Urbano",
  "Valdez",
  "Wong",
  "Yap",
  "Zamora",
]

function buildMembers(count: number): Member[] {
  const members: Member[] = []

  for (let index = 0; index < count; index += 1) {
    const idNumber = 1001 + index
    const first = FIRST_NAMES[index % FIRST_NAMES.length]
    const last = LAST_NAMES[(index * 3) % LAST_NAMES.length]
    const department = DEPARTMENTS[index % DEPARTMENTS.length]
    const college = COLLEGES[index % COLLEGES.length]
    const organization = ORGANIZATIONS[index % ORGANIZATIONS.length]

    members.push({
      id: `LCO-${idNumber}`,
      name: `${first} ${last}`,
      department,
      college,
      organization,
    })
  }

  return members
}

/** ~48 LCO members for admin monitoring + live scan lookup. */
export const MOCK_MEMBERS: Member[] = buildMembers(48)

export const MEMBER_COLLEGES = [...COLLEGES]
export const MEMBER_ORGANIZATIONS = [...ORGANIZATIONS]

const membersById = new Map(
  MOCK_MEMBERS.map((member) => [member.id.toUpperCase(), member])
)

export function findMemberById(rawId: string): Member | undefined {
  const normalized = rawId.trim().toUpperCase()
  if (!normalized) return undefined
  return membersById.get(normalized)
}
