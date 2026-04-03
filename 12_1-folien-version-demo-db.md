# 1-Folien-Version: Demo-DB fuer Rolloutplanung

## Titel

**Von der Rolloutliste zur Demo-DB: dieselbe Fachlogik, aber besser steuerbar**

---

## Kernbotschaft

> Heute ist die Rolloutplanung faktisch schon ein Datenmodell, aber in Form
> einer grossen Excel-Tabelle.
>
> Der naechste Schritt ist keine komplexe Software, sondern eine kleine,
> saubere Datenstruktur, auf der Agenten arbeiten koennen.

---

## Links: Heute

**Grosse Tabelle**

- eine Zeile muss Standort, Technik, Material, Status und Tour zugleich tragen
- offene Punkte sind oft implizit oder nur in Bemerkungsfeldern sichtbar
- Einkauf, Konfig und Montage schauen auf dieselbe ueberladene Sicht

---

## Rechts: Demo-DB

**Kleine operative Struktur**

- `Standorte`
- `Rollouts`
- `Tasks`
- `Materialbedarf`
- `Touren`

**Abgeleitete Views**

- `Rollout-Board`
- `Einkauf offen`
- `Konfig offen`
- `Tourfreigabe`

---

## Was Agenten damit tun koennen

- aus Bemusterungsdaten automatisch einen `Rollout` anlegen
- fehlende `Tasks` erzeugen
- `Materialbedarf` aus `Screen`, `Halterung`, `IP Power`, `Player` ableiten
- vor Tourfreigabe Risiken markieren
- Status konsistent nachfuehren

---

## Pointe fuer den Vortrag

**Nicht die Datenbank ist der Mehrwert.**

**Der Mehrwert ist, dass Agenten auf einer sauberen Struktur lesen, pruefen,
koordinieren und weitere Arbeitssichten erzeugen koennen.**

---

## Sprechtext 30 Sekunden

> Heute arbeiten wir faktisch bereits mit einer Datenbank, nur in schlechter
> Form: als grosse manuelle Tabelle. In einer Demo-DB wuerden wir dieselbe
> Fachlogik sauber trennen in Standort, Rollout, Task, Material und Tour. Der
> entscheidende Punkt ist nicht das technische Backend, sondern dass Agenten
> darauf offene Schritte erkennen, Material ableiten, Risiken markieren und je
> Rolle die richtige Sicht erzeugen koennen.
