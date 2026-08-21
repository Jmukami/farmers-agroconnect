# AgroConnect

AgroConnect is a React web application that helps farmers discover agricultural inputs and begin the registration and ordering process from one place. The current frontend prototype includes farmer registration, a farm-input catalogue, a shopping cart, and checkout verification.

## Features

- Register as a farmer with a name, phone number, location, and crop or livestock information.
- Browse a catalogue of seeds, fertilizers, crop-protection products, animal-feed supplements, and irrigation equipment.
- Add inputs to a cart and see the item count and total price in Kenyan shillings.
- Submit an order through the checkout and verification flow.
- Navigate between the Home, Register, and Farm Inputs views without a page reload.


## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

Clone the repository, move into the project directory, and install the dependencies:

```bash
git clone https://github.com/Jmukami/farmers-agroconnect.git
cd farmers-agroconnect
npm install
```

### Run the development server

```bash
npm run dev
```

## Project Structure

```text
src/
├── App.jsx       # Navigation and view switching
├── Home.jsx      # Landing view and primary actions
├── Register.jsx  # Farmer registration form
├── Inputs.jsx    # Product catalogue, cart, and checkout
├── assets/       # Static frontend assets
└── main.jsx      # React application entry point
```

## Team

This project is maintained by Team 6:

- Abelle Emmanuel
- Mark Kage
- Bruce Omondi
- Jochebed Mukami

Repository: [Jmukami/farmers-agroconnect](https://github.com/Jmukami/farmers-agroconnect)

The team is working with Teams 5 and 7. AgroConnect is intended to consume Team 5's API and provide an API for Team 7 to consume as the project develops.
