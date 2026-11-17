// js/data/nations.js
//
// Zentrale, datengetriebene Definition aller spielbaren Nationen.
// Neue Nation hinzufügen = neuer Eintrag hier + passendes Bild in assets/lands/.
// Es darf an keiner anderen Stelle im Code eine nationsspezifische
// Fallunterscheidung (if/else je Nation) geben.

export const nations = [
    {
        id: "rome",
        name: "Rom",
        leader: "Julius Cäsar",
        color: "#9E2A2B",
        image: "assets/lands/rome-caesar.png",
        description:
            "Das Römische Reich ist eine Macht der Disziplin und der Legionen. " +
            "Unter der Führung Julius Cäsars vereint es militärische Stärke mit " +
            "unnachgiebiger Organisation.",
        abilities: [
            {
                name: "Legionsdisziplin",
                description: "Militäreinheiten Roms sind besser organisiert und widerstandsfähiger im Kampf."
            },
            {
                name: "Straßenbau",
                description: "Infrastruktur wird schneller errichtet, wodurch sich Truppen und Waren rascher bewegen."
            },
            {
                name: "Veni, Vidi, Vici",
                description: "Eroberte Gebiete lassen sich leichter befrieden und in das Reich eingliedern."
            }
        ]
    },
    {
        id: "egypt",
        name: "Ägypten",
        leader: "Kleopatra VII.",
        color: "#C9A227",
        image: "assets/lands/egypt-cleopatra.png",
        description:
            "Das Reich am Nil ist geprägt von altem Wissen, Wohlstand und diplomatischem " +
            "Geschick. Kleopatra führt ihr Volk mit Klugheit und Weitblick.",
        abilities: [
            {
                name: "Segen des Nils",
                description: "Ländereien entlang von Flüssen liefern deutlich mehr Ressourcen."
            },
            {
                name: "Diplomatisches Erbe",
                description: "Beziehungen zu anderen Nationen verbessern sich schneller."
            },
            {
                name: "Schatzkammern",
                description: "Ägypten verfügt über größere Reserven an Gold und Vorräten."
            }
        ]
    },
    {
        id: "greece",
        name: "Griechenland",
        leader: "Leonidas I.",
        color: "#2E5984",
        image: "assets/lands/sparta-leonidas.png",
        description:
            "Griechenland vereint Philosophie, Wissenschaft und militärische Genialität. " +
            "Unter der Führung von Leonidas verteidigt es seine Freiheit mit absolutem Willen.",
        abilities: [
            {
                name: "Phalanx-Formation",
                description: "Verteidigende Einheiten erhalten einen deutlichen Kampfbonus."
            },
            {
                name: "Akademien",
                description: "Neue Technologien werden schneller erforscht."
            },
            {
                name: "Bis zum Tod",
                description: "Einheiten verlieren deutlich weniger Kampfkraft, wenn ihre Moral niedrig ist."
            }
        ]
    },
    {
        id: "namibia",
        name: "Namibia",
        leader: "Königin Kaipkire",
        color: "#B5651D",
        image: "assets/lands/namibia-witbooi.png",
        description:
            "Das Volk Namibias ist geprägt von Widerstandskraft und tiefem Verständnis " +
            "für ein hartes Land. Unter Königin Kaipkire verteidigt es seine Unabhängigkeit " +
            "mit Entschlossenheit.",
        abilities: [
            {
                name: "Wüstenkenner",
                description: "Einheiten erleiden in kargem oder trockenem Gelände keine Nachteile."
            },
            {
                name: "Widerstandsgeist",
                description: "Verteidigte Gebiete erholen sich schneller von Angriffen."
            },
            {
                name: "Karawanenhandel",
                description: "Handelsrouten durch unwegsames Gelände bringen zusätzlichen Gewinn."
            }
        ]
    },
    {
        id: "england",
        name: "England",
        leader: "Boudicca",
        color: "#3B6B5C",
        image: "assets/lands/england-boudica.png",
        description:
            "Angeführt von der kriegerischen Königin Boudicca erhebt sich Britannien gegen " +
            "jede Fremdherrschaft. Zorn und Zusammenhalt sind seine größten Stärken.",
        abilities: [
            {
                name: "Kriegerkönigin",
                description: "Bei Verteidigung des Heimatgebiets erhalten alle Einheiten einen Moralbonus."
            },
            {
                name: "Waldkampf",
                description: "Einheiten profitieren von Deckung in bewaldetem Gelände."
            },
            {
                name: "Aufstand",
                description: "Unterworfene gegnerische Gebiete lassen sich leichter zum Widerstand anstacheln."
            }
        ]
    },
    {
        id: "china",
        name: "China",
        leader: "Qin Shi Huang",
        color: "#6B3FA0",
        image: "assets/lands/china-qinshihuang.png",
        description:
            "Unter dem ersten Kaiser Qin Shi Huang vereint China gewaltige Bauprojekte, " +
            "straffe Verwaltung und eine der größten Armeen der bekannten Welt.",
        abilities: [
            {
                name: "Große Mauer",
                description: "Grenzbefestigungen werden günstiger errichtet und bieten mehr Schutz."
            },
            {
                name: "Zentralverwaltung",
                description: "Große Reiche verwalten sich mit weniger Unzufriedenheit."
            },
            {
                name: "Terrakotta-Armee",
                description: "Neue Einheiten werden schneller und kostengünstiger ausgehoben."
            }
        ]
    },
    {
    id: "carthage",
    name: "Karthago",
    leader: "Hannibal Barca",
    color: "#A64B2A",
    image: "assets/lands/carthage-hannibal.png",
    description:
        "Unter Hannibal Barca entwickelt sich Karthago zu einer gefürchteten Militärmacht. Seine Armeen sind für taktische Genialität, schnelle Manöver und den Einsatz von Kriegselefanten bekannt.",
    abilities: [
        {
            name: "Alpenüberquerung",
            description: "Armeen können schwieriges Gelände schneller durchqueren und erleiden dort weniger Verluste."
        },
        {
            name: "Taktisches Genie",
            description: "Hannibals Armeen erhalten im Kampf gegen zahlenmäßig überlegene Gegner einen Kampfvorteil."
        },
        {
            name: "Kriegselefanten",
            description: "Schwere Einheiten verursachen höheren Schaden und können feindliche Formationen durchbrechen."
        }
   ]
    },
    {
    id: "macedon",
    name: "Makedonien",
    leader: "Alexander der Große",
    color: "#C49A35",
    image: "assets/lands/macedon-alexander.png",
    description:
        "Alexander der Große führt Makedonien zu einem der größten Reiche der Antike. Seine Armeen verbinden schwere Infanterie, Kavallerie und außergewöhnliche Beweglichkeit.",
    abilities: [
        {
            name: "Makedonische Phalanx",
            description: "Schwere Infanterie erhält einen starken Verteidigungsbonus."
        },
        {
            name: "Companions",
            description: "Kavallerieeinheiten sind besonders schnell und verursachen hohen Angriffsschaden."
        },
        {
            name: "Unaufhaltsamer Eroberer",
            description: "Nach einer erfolgreichen Eroberung erhalten Armeen zusätzliche Bewegung."
        }
    ]
    },
    {
    id: "france",
    name: "Frankreich",
    leader: "Napoleon Bonaparte",
    color: "#3155A6",
    image: "assets/lands/france-napoleon.png",
    description:
        "Unter Napoleon Bonaparte wird Frankreich zu einer der mächtigsten Militärmächte Europas. Schnelle Manöver, massive Artillerie und disziplinierte Armeen prägen seine Kriegsführung.",
    abilities: [
        {
            name: "Grande Armée",
            description: "Frankreich kann größere Armeen aufstellen und erhält geringere Unterhaltskosten für Truppen."
        },
        {
            name: "Kaiserliche Artillerie",
            description: "Artillerieeinheiten verursachen deutlich höheren Schaden."
        },
        {
            name: "Napoleonisches Genie",
            description: "Armeen erhalten nach gewonnenen Schlachten zusätzliche Kampferfahrung."
        }
    ]
    },
    {
    id: "mongols",
    name: "Mongolen",
    leader: "Dschingis Khan",
    color: "#8B5A2B",
    image: "assets/lands/genghis-khan.png",
    description:
        "Unter Dschingis Khan entsteht aus den mongolischen Stämmen eine gewaltige Eroberungsmacht. Bewegliche Reiterarmeen ermöglichen schnelle Angriffe über riesige Entfernungen.",
    abilities: [
        {
            name: "Mongolische Reiterei",
            description: "Kavallerie besitzt deutlich höhere Bewegung."
        },
        {
            name: "Pfeilhagel",
            description: "Berittene Fernkampfeinheiten verursachen erhöhten Schaden."
        },
        {
            name: "Große Horde",
            description: "Mongolische Armeen können günstiger aufgestellt werden."
        }
    ]
    },
    {
    id: "russia",
    name: "Russland",
    leader: "Katharina die Große",
    color: "#4B6FA8",
    image: "assets/lands/russia-catherine.png",
    description:
        "Unter Katharina der Großen wächst Russland zu einer bedeutenden europäischen Großmacht. Diplomatie, Wirtschaft und eine große stehende Armee bilden die Grundlage ihrer Macht.",
    abilities: [
        {
            name: "Russisches Imperium",
            description: "Russland kann größere Gebiete verwalten, ohne dass die Unzufriedenheit stark steigt."
        },
        {
            name: "Kaiserliche Armee",
            description: "Militäreinheiten erhalten einen Bonus auf Verteidigung."
        },
        {
            name: "Expansion nach Osten",
            description: "Die Eroberung neuer Gebiete kostet weniger Ressourcen."
        }
    ]
    },
    {
    id: "japan",
    name: "Japan",
    leader: "Tomoe Gozen",
    color: "#B23A3A",
    image: "assets/lands/japan-tomoe.png",
    description:
        "Tomoe Gozen gilt als außergewöhnliche Kriegerin der japanischen Heian-Zeit. Ihre Fähigkeiten verbinden Disziplin, Mobilität und tödliche Präzision.",
    abilities: [
        {
            name: "Samurai",
            description: "Eliteinfanterie erhält höhere Angriffskraft und Moral."
        },
        {
            name: "Onna-musha",
            description: "Spezialeinheiten können sich schneller bewegen und verursachen höheren Schaden."
        },
        {
            name: "Bushido",
            description: "Einheiten kämpfen auch bei niedriger Moral besonders effektiv."
        }
    ]
    },
    {
    id: "persia",
    name: "Persisches Reich",
    leader: "Kyros der Große",
    color: "#B8862D",
    image: "assets/lands/persia-cyrus.png",
    description:
        "Unter Kyros dem Großen wächst Persien zu einem der größten Reiche der antiken Welt. Eine gewaltige Armee, starke Kavallerie und geschickte Verwaltung sichern die Expansion.",
    abilities: [
        {
            name: "Königliche Armee",
            description: "Persische Armeen können größer aufgestellt werden und benötigen weniger Unterhalt."
        },
        {
            name: "Unsterbliche",
            description: "Eliteinfanterie erhält höhere Angriffskraft und regeneriert einen Teil ihrer Verluste."
        },
        {
            name: "Reiter des Ostens",
            description: "Kavallerie erhält zusätzliche Bewegung und verursacht erhöhten Schaden gegen Fernkampfeinheiten."
        }
    ]
    },
    {
    id: "sparta",
    name: "Sparta",
    leader: "Leonidas I.",
    color: "#8E2020",
    image: "assets/lands/sparta-leonidas.png",
    description:
        "Sparta ist für seine außergewöhnlich disziplinierten Krieger bekannt. Kleine, hochtrainierte Armeen können selbst zahlenmäßig überlegene Gegner aufhalten.",
    abilities: [
        {
            name: "Spartanische Disziplin",
            description: "Spartanische Infanterie erhält einen starken Verteidigungs- und Moralbonus."
        },
        {
            name: "Phalanx",
            description: "Speerträger sind besonders effektiv gegen angreifende Nahkampfeinheiten."
        },
        {
            name: "Bis zum Tod",
            description: "Einheiten verlieren deutlich weniger Kampfkraft, wenn ihre Moral niedrig ist."
        }
    ]
    },
    {
    id: "numidia",
    name: "Numidien",
    leader: "Massinissa",
    color: "#B66A32",
    image: "assets/lands/numidia-massinissa.png",
    description:
        "Numidien ist eine schnelle und bewegliche Militärmacht Nordafrikas. Leichte Kavallerie ermöglicht schnelle Angriffe, Aufklärung und taktische Rückzüge.",
    abilities: [
        {
            name: "Numidische Reiter",
            description: "Leichte Kavallerie besitzt außergewöhnlich hohe Bewegung."
        },
        {
            name: "Wüstenkrieger",
            description: "Armeen erleiden in trockenen Gebieten weniger Bewegungseinbußen."
        },
        {
            name: "Hit-and-Run",
            description: "Kavallerie kann nach einem Angriff einen Teil ihrer Bewegung zurückerhalten."
        }
    ]
    },
    {
    id: "palmyra",
    name: "Palmyra",
    leader: "Zenobia",
    color: "#8B5E83",
    image: "assets/lands/palmyra-zenobia.png",
    description:
        "Zenobia verwandelt Palmyra in eine mächtige Wüstenmacht. Schnelle Kavallerie, erfahrene Truppen und die strategische Kontrolle wichtiger Handelswege ermöglichen rasche Expansion.",
    abilities: [
        {
            name: "Wüstenkavallerie",
            description: "Kavallerie erhält in Wüstengebieten zusätzliche Bewegung und Kampfkraft."
        },
        {
            name: "Königin des Ostens",
            description: "Palmyra erhält zusätzliche Ressourcen aus Handelsgebieten."
        },
        {
            name: "Palmyrenische Armee",
            description: "Gemischte Armeen aus orientalischen und römisch beeinflussten Einheiten erhalten einen Moralbonus."
        }
    ]
    },
    {
    id: "caria",
    name: "Karien",
    leader: "Artemisia I.",
    color: "#3E7180",
    image: "assets/lands/caria-artemisia.png",
    description:
        "Die karische Herrscherin Artemisia I. verbindet die strategische Bedeutung Anatoliens mit einer mächtigen Flotte und engen Beziehungen zum Persischen Reich.",
    abilities: [
        {
            name: "Karische Flotte",
            description: "Schiffe sind günstiger und erhalten einen Bonus im Kampf auf See."
        },
        {
            name: "Herrin der Ägäis",
            description: "Karische Einheiten erhalten zusätzliche Bewegung in Küstengebieten."
        },
        {
            name: "Strategische Allianz",
            description: "Karien kann leichter Bündnisse schließen und erhält zusätzliche Vorteile durch verbündete Nationen."
        }
    ]
    },

];

export function getNationById(id) {
    return nations.find((nation) => nation.id === id) || null;
}
