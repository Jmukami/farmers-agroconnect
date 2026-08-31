Team 6:Agroconnect(Downstream API for team 7)
|Method | Path| Purpose |Maps to Need|
|:--- |:---- |:--- |
|GET | /farmers/{farmerid} |Return the detailed personal and contact information for single specific farmer. |"Team 7 needs to read aspiring farmers' personal details such as contact information in order to verify members identities and register them for agricultural club memberships" |
|GET | clubs/{clubId}/capacity | Return the current enrollment count and maximum capacity for a specific club. | "Team 7 needs to read number of members that can be taken in order to enforce enrollment limits and prevent overbooking for agricultural clubs." |
| GET |clubs/{clubId}/memberships/{farmerId} | Return the specific membership details for a farmer in a club, including the fee requirements, due date and payment staus. | "Team 7 needs to read membership fee requirements and payment status in order to charge correct subscription dues and active membership status to farmers." |
| GET | clubs/{clubId}/schedule | Return  a list of upcoming meeting schedules and events | "Team 7 needs to read club membership meeting schedules and event days in order to display upcoming club activities on member calendars and prevent scheduling conflicts." |
| GET | /product/{productId} | Return a list of available farming products and equipment with details like name,description and price. | "Team 7 needs to read available farming products and catalog listings in order to allow agricultural club members to browse and order farm inputs or equipment directly through their app." | 
| POST | /orders | Submit a new purchase order for farm inputs or requirements directly through the platform. | "Team 7 needs to read available farming products and catalog listings in order to allow agricultural club members to browse and order farm inputs or equipment directlythrough their app."|

