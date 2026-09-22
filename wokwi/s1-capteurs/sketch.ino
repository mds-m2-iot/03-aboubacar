// =====================================================================
//  Ma plante connectee · simulation des capteurs (seance 1)
//  Module M2 Applications mobiles et connectees (IoT) · Sergent.dev
// =====================================================================
//
//  Ce que fait ce programme :
//    il lit les trois capteurs toutes les deux secondes, traduit les
//    valeurs brutes en pourcentages, en deduit une humeur, l'affiche
//    sur l'ecran et l'ecrit dans la console serie.
//
//  Ce que tu manipules pendant le TP :
//    - le potentiometre remplace le capteur d'humidite du sol. Tourne-le
//      vers la GAUCHE pour simuler une terre humide. Ce n'est pas une
//      erreur : le capteur capacitif reel renvoie lui aussi une valeur
//      qui BAISSE quand l'humidite monte.
//    - la photoresistance se regle avec le curseur de luminosite.
//    - le DHT22 se regle en cliquant dessus, temperature et humidite.
//
//  Ce qui manque par rapport au vrai kit :
//    il n'y a pas de Bluetooth. Wokwi ne le simule pas, c'est ecrit dans
//    sa documentation. La liaison Bluetooth se decouvre en seance 2 avec
//    la vraie carte, et ce programme ne cherche pas a l'imiter.
//
//  Le cablage du schema est exactement celui de la fiche de cablage :
//  humidite sur GPIO34, lumiere sur GPIO35, DHT22 sur GPIO25,
//  ecran sur GPIO21 et GPIO22, tout en 3,3 V.
// =====================================================================

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// --------------------------------------------------------- broches
// Identiques a la fiche de cablage du kit reel, volontairement.
#define PIN_HUMIDITE  34
#define PIN_LUMIERE   35
#define PIN_DHT       25
#define PIN_SDA       21
#define PIN_SCL       22

// ----------------------------------------------------- calibration
// Les bornes de la simulation ne sont PAS celles du kit reel, et c'est
// le premier enseignement de la journee : un capteur se calibre, et une
// calibration ne se transporte pas d'un capteur a l'autre.
//
// Dans Wokwi, le potentiometre couvre toute la plage 0 a 4095, et la
// photoresistance monte quand la lumiere monte, a l'inverse du module
// LM393 du kit. Les deux jeux de bornes sont donc differents.
#define SIM_SOL_SEC     4095   // potentiometre a droite
#define SIM_SOL_HUMIDE  0      // potentiometre a gauche
#define SIM_LUM_SOMBRE  0      // curseur de luminosite au minimum
#define SIM_LUM_CLAIR   4095   // curseur au maximum

// ------------------------------------------------- seuils de l'espece
// Repris de la fiche d'identite de la plante remplie le matin.
#define SEUIL_BAS   30
#define SEUIL_HAUT  70

#define PERIODE_MESURE_MS 2000

DHT dht(PIN_DHT, DHT22);
Adafruit_SSD1306 ecran(128, 64, &Wire, -1);
bool ecranPresent = false;
unsigned long derniereMesure = 0;

// ---------------------------------------------------------------------
//  Conversion d'une valeur brute du convertisseur en pourcentage.
//  Cette fonction est la copie exacte de celle du firmware du kit :
//  meme signature, meme bornage, meme comportement quand les deux
//  bornes sont egales. C'est elle qui est testee en seance 6.
// ---------------------------------------------------------------------
float versPourcentage(int brut, int borneBasse, int borneHaute) {
  if (borneBasse == borneHaute) return 0.0f;
  float pct = (float)(borneBasse - brut) * 100.0f / (float)(borneBasse - borneHaute);
  if (pct < 0.0f)   pct = 0.0f;
  if (pct > 100.0f) pct = 100.0f;
  return pct;
}

// ---------------------------------------------------------------------
//  Traduction d'une humidite en humeur. Cinq etats, dans l'ordre du
//  plus mouille au plus sec. Les bornes sont celles du contrat commun
//  a la carte et a l'application : si tu les changes ici, change-les
//  partout, sinon l'ecran et le telephone ne diront pas la meme chose.
// ---------------------------------------------------------------------
const char* humeurDe(float humidite) {
  if (humidite > SEUIL_HAUT + 15) return "Je nage, arrete un peu";
  if (humidite > SEUIL_HAUT)      return "J'ai un peu trop bu";
  if (humidite < SEUIL_BAS - 15)  return "Au secours, de l'eau";
  if (humidite < SEUIL_BAS)       return "J'ai soif";
  return "Tout va bien, merci";
}

// ---------------------------------------------------------------------
//  Moyenne de trois lectures. Le convertisseur de l'ESP32 saute de
//  plusieurs dizaines d'unites d'une lecture a l'autre, y compris en
//  simulation : moyenner trois lectures suffit a stabiliser l'affichage.
// ---------------------------------------------------------------------
int lireMoyenne(uint8_t broche) {
  long somme = 0;
  for (int i = 0; i < 3; i++) { somme += analogRead(broche); delay(4); }
  return (int)(somme / 3);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[BOOT] Plante simulee · seance 1");

  pinMode(PIN_HUMIDITE, INPUT);
  pinMode(PIN_LUMIERE, INPUT);
  dht.begin();

  // L'ecran est optionnel : s'il n'est pas la, le programme continue.
  // On le verifie, on ne le suppose pas.
  Wire.begin(PIN_SDA, PIN_SCL);
  ecranPresent = ecran.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!ecranPresent) {
    Serial.println("[ERR ] ecran OLED absent · on continue sans");
  } else {
    ecran.clearDisplay();
    ecran.setTextColor(SSD1306_WHITE);
    ecran.setTextSize(1);
    ecran.setCursor(0, 28);
    ecran.println("Plante simulee");
    ecran.display();
  }
  Serial.println("[BOOT] pret · tourne le potentiometre pour arroser");
}

void loop() {
  unsigned long maintenant = millis();
  if (maintenant - derniereMesure < PERIODE_MESURE_MS) return;
  derniereMesure = maintenant;

  // 1. lecture des valeurs brutes
  int brutSol = lireMoyenne(PIN_HUMIDITE);
  int brutLum = lireMoyenne(PIN_LUMIERE);

  // 2. traduction en grandeurs utiles
  float humidite = versPourcentage(brutSol, SIM_SOL_SEC, SIM_SOL_HUMIDE);
  float lumiere  = versPourcentage(brutLum, SIM_LUM_SOMBRE, SIM_LUM_CLAIR);

  // 3. le DHT22 rate une lecture sur dix, en simulation comme en vrai.
  //    On garde la valeur precedente plutot que d'envoyer un trou.
  static float dernierT = 20.0f, dernierH = 50.0f;
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  bool dhtValide = !(isnan(t) || isnan(h));
  if (dhtValide) { dernierT = t; dernierH = h; }

  // 4. l'humeur, la seule chose que l'utilisateur regarde vraiment
  const char* humeur = humeurDe(humidite);

  Serial.printf("[MES ] brut sol %4d · hum %5.1f%% · temp %4.1fC · lum %5.1f%% · %s\n",
                brutSol, humidite, dernierT, lumiere, humeur);
  if (!dhtValide) Serial.println("[ERR ] DHT22 muet, valeur precedente conservee");

  if (!ecranPresent) return;
  ecran.clearDisplay();
  ecran.setTextSize(1);
  ecran.setCursor(0, 0);
  ecran.print("Plante simulee");

  ecran.setTextSize(2);
  ecran.setCursor(0, 14);
  ecran.print((int)humidite);
  ecran.print("%");

  ecran.setTextSize(1);
  ecran.setCursor(64, 14);
  ecran.print(dernierT, 1);
  ecran.print("C");
  ecran.setCursor(64, 24);
  ecran.print((int)lumiere);
  ecran.print("% lum");

  ecran.setCursor(0, 44);
  ecran.print(humeur);
  ecran.display();
}
