# Team 6: AgroConnect
## Downstream API Needs (Campus Hub / Team 7 consuming AgroConnect's API)

1. Campus Hub needs to read farmers’ personal details (contact info) in order to verify member identities and register memberships.
2. Campus Hub needs to access the locations of members’ farms in order to easy facilitate activities that may involve visits to said farms.
3. Campus Hub needs to read farming product information including the name, category, description and other relevant product details to be listed on their website as well.
4. Campus Hub also needs to access inventory details for the farming products, that is, the available products, quantity/stock etc.

---

### Reflection
During our partner interview with Campus Hub (Team 7), we identified key integration touchpoints between our digital agricultural marketplace and their campus/club platform. By providing standardized REST access to farmer profiles, farm location details, product catalog metadata, and real-time inventory levels, AgroConnect allows Campus Hub to verify members, coordinate farm educational visits, and display live agricultural supply listings. Establishing clear API contracts early ensures smooth cross-platform data exchange without coupling internal business logic.