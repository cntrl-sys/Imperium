# IMPERIVM

Ein lokal spielbares Echtzeit-Strategiespiel im Browser.

## Start

Im Projektordner einen lokalen Webserver starten:

```sh
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Die ES-Module funktionieren nicht zuverlässig, wenn `index.html` direkt als Datei geöffnet wird.

## Spielen

1. **Neues Spiel** wählen, eine Nation und eine Karte auswählen.
2. Eine eigene Einheit anklicken. Mit Umschalt-Klick weitere Truppen zur Auswahl hinzufügen.
3. Ein freies Feld anklicken, um dorthin zu marschieren. Die Einheiten finden ihren Weg selbstständig und bewegen sich in Echtzeit.
4. Gegner oder Gebäude anklicken, um einen Angriff zu befehlen. In Reichweite kämpfen die Truppen automatisch.
5. Über **Einheiten** Truppen anheuern. Landtruppen erscheinen an der Hauptstadt, Schiffe am Hafen.

Der Sieg gelingt durch die Einnahme der gegnerischen Hauptstädte. Wähle mehrere Einheiten mit Umschalt-Klick und markiere ein gemeinsames Marschziel. Angriffe erfolgen automatisch, sobald gegnerische Truppen in Reichweite sind.

## Aufbau

- `js/data/`: Nationen, Karten und Einheitentypen
- `js/game/`: Partie, Echtzeitbewegung, Kampf, Käufe und Versorgung
- `js/ai/`: Gegnerlogik
- `js/render/`: Sprite-Laden und Animation
- `js/screens/`: Start, Nationenwahl, Kartenauswahl und Partie
- `assets/`: verwendete Karten, Nationenporträts, Hintergrund und verfügbare Sprites

## Aktueller Ausbau

Die sechs Szenarien nutzen große Karten mit 42 × 28 Feldern und zwei bis vier gegnerischen Reichen. Die Gegnernationen und ihre Strategien werden für jede neue Partie zufällig und ohne doppelte Nationen ausgewählt. Größere Geländefelder geben der Karte mehr Raum; die Einheiten sind dafür etwas kleiner skaliert. Organische Küsten, zusammenhängende Wälder, geschichtete Höhenzüge, Dünen, gewundene Wege und Brücken lösen das alte, regelmäßige Kachelbild ab. Sichtweite und Nebel des Krieges zeigen nur erkundete Gebiete und aktuell sichtbare Gegner. Jäger erkunden besonders weit; Hauptstadt, Kasernen und weitere Gebäude geben ihrer Umgebung ebenfalls Sicht. Gegner haben unterschiedliche Rekrutierungsrhythmen und beginnen mit einer Hauptstadtwache.

Hauptstädte lassen sich nicht durch das Betreten eines Felds erobern. Eine Belagerung benötigt mindestens drei kampffähige Land- oder Lufteinheiten im Umkreis von zwei Feldern. Verteidiger in der Nähe unterbrechen den Belagerungsfortschritt. Hält die Belagerungsarmee das Gebiet 30 Sekunden lang, fällt die Hauptstadt; Arbeiter und Schiffe können keine Belagerung führen. So braucht der Sieg Armeeaufbau, Kämpfe und Zeit statt eines einzelnen Vorstoßes.

Bogenschützen und Schiffe marschieren mit ihrer höheren Geschwindigkeit. Arbeiter sammeln automatisch Holz, Stein und Getreide auf Ressourcenfeldern; die Vorräte werden im HUD angezeigt und erschöpfen sich stufenweise. Goldadern sind mit einem goldenen Symbol markiert und liefern pro Arbeiter acht Gold je Erntetakt (alle zehn Sekunden); das HUD zeigt den daraus entstehenden Goldzuwachs an. Das Grundeinkommen kommt ebenfalls alle zehn Sekunden. Die Einheitenauswahl enthält außerdem Minotauren, Jäger und drei Drachenarten aus den Spielnotizen.

Im Inselarchipel liegen fünf getrennte Reiche auf eigenen Inseln. Wähle eine Landtruppe und danach ein benachbartes eigenes Schiff, um sie einzuschiffen. Bewege das Schiff an eine Küste und klicke ein freies Landfeld neben dem Schiff, um die Truppe auszuschiffen. Flussläufe, Seen und Brücken sind auf den jeweiligen Szenarien als befahrbares Wasser bzw. Übergang modelliert.

Über **Handel** kannst du alle zehn Sekunden ein Angebot an ein gegnerisches Reich senden. Bei Annahme werden die Güter übertragen; der Gesandte zeigt die passende Zustimmungs- oder Ablehnungsreaktion.

Für das **Inselarchipel** kann vor dem Start die Zahl der gegnerischen Reiche von eins bis acht gewählt werden. Die Karte ist dort 84 × 56 Felder groß und besteht aus vielen voneinander getrennten bewohnten und neutralen Inseln. Neutrale Inseln haben keine Hauptstadt und gehören anfangs keinem Reich; sie bieten Platz für eigene Außenposten.

Das zusätzliche Szenario **Saphirmeer** verwendet eine gemalte Draufsicht als Spielhintergrund und eine separate 96 × 54 Geländemaske für Bewegung, Ressourcen und Häfen. Landflächen und Inseln sind spielmechanisch eigenständig erfasst. Vor dem Start lassen sich auch hier eins bis acht gegnerische Reiche wählen.

Alle Reiche beginnen im Frieden. Das Fenster **Beziehungen** zeigt ihre Stimmung und den aktuellen Status. Gegner können später selbst den Krieg erklären; ein eigener Angriff oder eine Belagerung beendet den Frieden sofort. Gute Handelsangebote verbessern die Stimmung, Ablehnungen verschlechtern sie. Solange Frieden herrscht, greifen Einheiten und Wachtürme nicht automatisch an.

Die **Chronik** sammelt die letzten Meldungen zu Kämpfen, Rekrutierungen, Eroberungen, Handel und Rohstoffgewinn. Sie wird mit der Partie gespeichert und ist beim Fortsetzen wieder verfügbar.

Über **Bauen** errichtet ein freier Arbeiter auf einem angrenzenden Landfeld eine Kaserne oder ein Lagerhaus. Kasernen sind zusätzliche Rekrutierungspunkte. Lagerhäuser erweitern den Vorrat jedes Rohstoffs um 50. Gebäude haben Lebenspunkte, blockieren das Feld und können von Einheiten angegriffen sowie zerstört werden. Gegner haben unterschiedliche Rollen, Kampfstärken, Einkommen und Rekrutierungsrhythmen; sie bauen ebenfalls Kasernen und führen auf Inselkarten neue Truppen mit Transportschiffen heran.

Zur Verteidigung kann ein Arbeiter außerdem **Mauern**, **Tore** und **Wachtürme** errichten. Mauern versperren den Weg und lassen sich zerstören. Tore sind nur für Truppen ihres Besitzers passierbar; Feinde müssen sie umgehen oder einreißen. Wachtürme greifen gegnerische Einheiten automatisch mit Pfeilen an und erweitern die Sicht. Jede Nation hat eine eigene Eliteeinheit: darunter Roms Legionäre, Ägyptens Streitwagen, Spartas Hopliten, Karthagos Kriegselefanten und die schnelle mongolische Reiterei. China behält seine exklusiven Drachen. Gegner rekrutieren ebenfalls ihre nationalen Einheiten.

Mit einer **Akademie** wird außerdem das Forschungsmenü freigeschaltet. Erforsche im Echtzeitverlauf bessere Waffen, Reichsverwaltung, Befestigungen oder Seekarten. Jede Technologie kostet Rohstoffe, läuft über Zeit und bleibt dauerhaft für den Rest der Partie aktiv. Im Menü **Akademie** kannst du zusätzlich Arbeiter und Soldaten ausbilden lassen. Ausgebildete Soldaten haben mehr Lebenspunkte und richten zusätzlichen Schaden an. Ausgebildete Arbeiter sammeln 50 % mehr und erhalten durch Klick auf ein Rohstofffeld einen Sammelauftrag; ist das Feld erschöpft, suchen sie automatisch das nächste Vorkommen derselben Sorte. Ausbildungsfortschritt und Aufträge bleiben im Spielstand erhalten. Die Gegner errichten ebenfalls Akademien und lassen Soldaten ausbilden.

## Spielstände

Aktive Partien werden beim Start und nach jeder Aktion automatisch im lokalen Browserspeicher gesichert. Über **Spiel fortsetzen** kommst du vom Startmenü zur letzten Partie zurück. Der Browserspeicher gehört zu genau dieser Browser-Adresse; nutze **Spielstand exportieren** und **Spielstand importieren**, wenn du die Partie mit einem anderen lokalen Host oder einer anderen Portnummer weiterspielen möchtest. Exportierte Spielstände sind JSON-Dateien und enthalten den kompletten Spielverlauf der laufenden Partie.
# Pixel-Sprites

Die Einheiten verwenden gemeinsame, nationenunabhängige Pixel-Sprite-Sheets.
Stoff und Umhang werden beim Rendern in die Farbe der jeweiligen Nation
eingefärbt. Die fünf Blickrichtungen und die Frames für Idle, Bewegung,
Angriff und Treffer entsprechen dem Raster in `js/render/spriteConfig.js`.

Die SVG-Sheets sind reproduzierbar aus dem Generator erstellt:

```sh
python3 scripts/generate_pixel_sprites.py
```

Neue Einheitstypen können in `scripts/generate_pixel_sprites.py` ergänzt
werden; Dateibasisnamen müssen zur Zuordnung in `spriteConfig.js` passen.

Die Figuren haben eine höher aufgelöste, gemeinsame Pixelgestaltung mit
Rüstung, Ausrüstung und national eingefärbten Gewändern. Die Karte wird ohne
sichtbare Kachelränder als zusammenhängende Landschaft mit Wäldern, Höhenzügen,
Dünen, Flüssen und Brücken gezeichnet.
