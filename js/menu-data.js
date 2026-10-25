// Menu data. Edit this file to change items, prices, descriptions and photos.
// Shape: panels -> categories -> items (one item per line). Rendered by js/menu-render.js.
// prices: one number per size (matches priceNote). variant: drinks with a flavour picker;
//   cartPrice is what the cart charges — keep it equal to prices[0], the price shown on the menu.
window.MENU_DATA = {
  "panels": [
    {
      "id": "pizzas", "label": "Pizzas",
      "categories": [
        {
          "title": "The Crosta – Signature", "items": [
            {"name": "Crosta Garlic Butter Pizza", "desc": "Garlic butter base, herbs, mozzarella, light veggies", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Best Seller"}], "prices": [249, 369, 519], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-garlic-butter-pizza.webp", "alt": "Garlic Butter Pizza"},
            {"name": "Crosta Peri Peri Blast", "desc": "Paneer, onion, capsicum, peri peri sauce, mozzarella", "badges": [{"type": "spicy", "label": "🌶 Spicy"}], "prices": [249, 369, 519], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-peri-peri-pizza.webp", "alt": "Peri Peri Pizza"},
            {"name": "Crosta Special Pizza", "desc": "Paneer, onion, capsicum, corn, olives, special sauce, mozzarella", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Most Popular"}], "prices": [249, 379, 539], "priceNote": "8″ / 10″ / 12″", "img": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=160&q=75&fit=crop", "alt": "Crosta Special Pizza"},
            {"name": "Crosta Fire Ring Pizza", "desc": "Spicy paneer, jalapeño, chilli flakes, lava spicy sauce, mozzarella", "badges": [{"type": "spicy", "label": "🌶🌶 Very Spicy"}], "prices": [259, 389, 559], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-fire-ring-pizza.webp", "alt": "Fire Ring Pizza"}
          ]
        },
        {
          "title": "Basic Range Pizzas", "items": [
            {"name": "Margherita Pizza", "desc": "Classic tomato sauce, mozzarella cheese, herbs", "badges": [{"type": "veg", "label": "Veg"}], "prices": [89, 179, 299], "priceNote": "8″ / 10″ / 12″", "img": "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=160&q=75&fit=crop", "alt": "Margherita Pizza"},
            {"name": "Corn Cheese Pizza", "desc": "Sweet corn, mozzarella cheese, herbs", "badges": [{"type": "veg", "label": "Veg"}], "prices": [99, 189, 319], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-corn-cheese-pizza.webp", "alt": "Corn Cheese Pizza"},
            {"name": "Veg Delight Lite", "desc": "Capsicum, mushroom, jalapeño, mozzarella, herbs", "badges": [{"type": "veg", "label": "Veg"}], "prices": [129, 219, 349], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-veg-delight-pizza.webp", "alt": "Veg Delight Pizza"},
            {"name": "Farm House Pizza", "desc": "Onion, capsicum, tomato, mushroom, mozzarella", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Most Popular"}], "prices": [139, 229, 369], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-farm-house-pizza.webp", "alt": "Farm House Pizza"}
          ]
        },
        {
          "title": "Single Topping Pizzas", "items": [
            {"name": "Standard Single Topping", "desc": "Choice of any one classic topping: Onion, Capsicum, Sweet Corn, Tomato, Mushroom, or Jalapeños", "badges": [{"type": "veg", "label": "Veg"}], "prices": [99, 179, 309], "priceNote": "8″ / 10″ / 12″"},
            {"name": "Premium Single Topping", "desc": "Choice of any one premium topping: Paneer", "badges": [{"type": "veg", "label": "Veg"}], "prices": [129, 219, 359], "priceNote": "8″ / 10″ / 12″"}
          ]
        },
        {
          "title": "Indian Flavour Pizzas", "items": [
            {"name": "Makhani Paneer Pizza", "desc": "Paneer, capsicum, creamy makhani sauce, mozzarella", "badges": [{"type": "veg", "label": "Veg"}], "prices": [189, 289, 419], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-makhani-paneer-pizza.webp", "alt": "Makhani Paneer Pizza"},
            {"name": "Tandoori Paneer Pizza", "desc": "Paneer, onion, red pepper, tandoori sauce, mozzarella", "badges": [{"type": "veg", "label": "Veg"}, {"type": "spicy", "label": "Spicy"}, {"type": "best", "label": "Chef's Recommendation"}], "prices": [199, 299, 439], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-tandoori-paneer-pizza.webp", "alt": "Tandoori Paneer Pizza"},
            {"name": "Paneer Tikka Pizza", "desc": "Smoky paneer tikka, onion, capsicum, mozzarella", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Chef's Special"}], "prices": [199, 299, 439], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-paneer-tikka-pizza.webp", "alt": "Paneer Tikka Pizza"}
          ]
        },
        {
          "title": "Spicy Range", "items": [
            {"name": "Chilli Heat Pizza", "desc": "Capsicum, onion, jalapeño, chilli sauce, mozzarella", "badges": [{"type": "spicy", "label": "🌶 Spicy"}, {"type": "best", "label": "Most Popular"}], "prices": [189, 289, 419], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-chilli-heat-pizza.webp", "alt": "Chilli Heat Pizza"},
            {"name": "Spicy Paneer Pizza", "desc": "Paneer, capsicum, spicy sauce, mozzarella", "badges": [{"type": "spicy", "label": "🌶 Spicy"}], "prices": [199, 299, 439], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-spicy-paneer-pizza.webp", "alt": "Spicy Paneer Pizza"},
            {"name": "Peri Peri Veg Pizza", "desc": "Capsicum, onion, corn, peri peri sauce, mozzarella", "badges": [{"type": "veg", "label": "Veg"}, {"type": "spicy", "label": "Spicy"}], "prices": [199, 299, 439], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-peri-peri-veg-pizza.webp", "alt": "Peri Peri Veg Pizza"}
          ]
        },
        {
          "title": "Premium / Loaded Pizzas – Top Pick", "items": [
            {"name": "Cheese Overload Pizza", "desc": "Double mozzarella cheese, cheese sauce", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Top Pick"}], "prices": [199, 299, 449], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-cheese-overload-pizza.webp", "alt": "Cheese Overload Pizza"},
            {"name": "Black & White Pizza", "desc": "Black olives, corn, jalapeño, extra mozzarella", "prices": [209, 319, 469], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-black-and-white-pizza.webp", "alt": "Black and White Pizza"},
            {"name": "Veggie Delight", "desc": "Onion, capsicum, mushroom, corn, paneer, mozzarella", "badges": [{"type": "veg", "label": "Veg"}], "prices": [219, 329, 479], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-classic-veg-loaded-pizza.webp", "alt": "Classic Veg Loaded Pizza"},
            {"name": "Veggie Supreme Pizza", "desc": "Onion, capsicum, mushroom, corn, paneer, olives, mozzarella", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Chef's Recommendation"}], "prices": [229, 339, 499], "priceNote": "8″ / 10″ / 12″", "img": "images/menu-classic-veg-loaded-pizza.webp", "alt": "Veggie Supreme Pizza"}
          ]
        }
      ]
    },
    {
      "id": "burgerswraps", "label": "Burgers, Wraps & Sandwiches",
      "categories": [
        {
          "id": "qb-burgers", "title": "Burgers", "items": [
            {"name": "Veg Grilled Burger", "desc": "Classic veg patty, signature house spreads, fresh salad veggies.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [49, 109], "priceNote": "Single / Meal", "img": "images/menu-veg-grilled-burger.webp", "alt": "Veg Grilled Burger"},
            {"name": "Chips Burger", "desc": "Classic veg burger with a crunchy layer of potato chips.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [69, 129], "priceNote": "Single / Meal", "img": "images/menu-chips-burger.webp", "alt": "Chips Burger"},
            {"name": "Mint Burger", "desc": "Classic veg burger loaded with refreshing house mint sauce.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [79, 139], "priceNote": "Single / Meal", "img": "images/menu-mint-burger.webp", "alt": "Mint Burger"},
            {"name": "Sweet Corn Burger", "desc": "Classic veg burger with sweet corn and creamy mayo.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [89, 149], "priceNote": "Single / Meal", "img": "images/menu-sweet-corn-burger.webp", "alt": "Sweet Corn Burger"},
            {"name": "Cheeseburger", "desc": "Grilled veg burger topped with a melted cheese slice.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [99, 159], "priceNote": "Single / Meal", "img": "images/menu-cheese-burger.webp", "alt": "Cheese Burger"},
            {"name": "Spicy Jalapeño Burger", "desc": "Grilled veg burger with extra spicy jalapeños and house sauce.", "badges": [{"type": "veg", "label": "Veg"}, {"type": "spicy", "label": "Spicy"}], "prices": [109, 169], "priceNote": "Single / Meal", "img": "images/menu-spicy-jalape-o-burger.webp", "alt": "Spicy Jalapeño Burger"},
            {"name": "Paneer Burger", "desc": "Thick, golden-fried paneer block, signature sauces.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [119, 179], "priceNote": "Single / Meal", "img": "images/menu-paneer-burger.webp", "alt": "Paneer Burger"},
            {"name": "Pizza Burger", "desc": "2 Veg Patties, 3 Layers of Cheese, wrapped in pizza dough.", "badges": [{"type": "veg", "label": "Veg"}, {"type": "best", "label": "Chef's Recommendation"}], "prices": [129, 189], "priceNote": "Single / Meal", "img": "images/menu-pizza-burger.webp", "alt": "Pizza Burger"},
            {"name": "The Crosta Burger", "desc": "Triple stack: 2 Veg Patties, 1 Grilled Paneer Patty, 3 Layers of Cheese.", "badges": [{"type": "best", "label": "Most Popular"}], "prices": [139, 199], "priceNote": "Single / Meal", "img": "images/menu-the-crosta-burger.webp", "alt": "The Crosta Burger"}
          ]
        },
        {
          "id": "qb-wraps", "title": "Wraps", "items": [
            {"name": "Veg Wrap", "desc": "Grilled tortilla, chopped veggies, lettuce, house spreads.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [69, 129], "priceNote": "Single / Meal", "img": "images/menu-veg-wrap.webp", "alt": "Veg Wrap"},
            {"name": "Aloo Tikki Wrap", "desc": "Classic veg wrap, hot spicy potato patty core.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [79, 139], "priceNote": "Single / Meal", "img": "images/menu-aloo-tikki-wrap.webp", "alt": "Aloo Tikki Wrap"},
            {"name": "Cheese Corn Wrap", "desc": "Fresh veggie wrap, sweet corn, melted cheese sauce.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [79, 139], "priceNote": "Single / Meal", "img": "images/menu-cheese-corn-wrap.webp", "alt": "Cheese Corn Wrap"},
            {"name": "Paneer Wrap", "desc": "Spiced paneer chunks, crunchy veggies.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [110, 169], "priceNote": "Single / Meal", "img": "images/menu-paneer-wrap.webp", "alt": "Paneer Wrap"},
            {"name": "Paneer Tikki Wrap", "desc": "Spiced paneer chunks with hot spicy potato patty, crunchy veggies.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [119, 179], "priceNote": "Single / Meal", "img": "images/menu-paneer-tikki-wrap.webp", "alt": "Paneer Tikki Wrap"}
          ]
        },
        {
          "id": "qb-sandwiches", "title": "Sandwiches", "items": [
            {"name": "Grilled Sandwich", "desc": "Toasted bread, chopped veggies, house spreads.", "prices": [69, 129], "priceNote": "Single / Meal", "img": "images/menu-grilled-sandwich.webp", "alt": "Grilled Sandwich"},
            {"name": "Paneer Potato Sandwich", "desc": "Spiced potato patty, fresh paneer.", "prices": [99, 159], "priceNote": "Single / Meal", "img": "images/menu-paneer-potato-sandwich.webp", "alt": "Paneer Potato Sandwich"},
            {"name": "Sweet Corn Sandwich", "desc": "Veggie sandwich, sweet corn, creamy mayo.", "prices": [89, 149], "priceNote": "Single / Meal", "img": "images/menu-sweet-corn-sandwich.webp", "alt": "Sweet Corn Sandwich"},
            {"name": "Cheese Sandwich", "desc": "Hot-pressed, processed cheese, herbs.", "prices": [109, 169], "priceNote": "Single / Meal", "img": "images/menu-cheese-sandwich.webp", "alt": "Cheese Sandwich"},
            {"name": "Double Cheese Sandwich", "desc": "Grilled, double layers of melted cheese.", "prices": [129, 189], "priceNote": "Single / Meal", "img": "images/menu-double-cheese-sandwich.webp", "alt": "Double Cheese Sandwich"}
          ]
        }
      ]
    },
    {
      "id": "quickbites", "label": "Quick Bites",
      "categories": [
        {
          "id": "qb-fries", "title": "Fries", "items": [
            {"name": "Salted Fries", "prices": [69, 99], "priceNote": "Regular / Large", "img": "images/menu-salted-fries.webp", "alt": "Salted Fries"},
            {"name": "Masala Fries", "prices": [89, 119], "priceNote": "Regular / Large", "img": "images/menu-masala-fries.webp", "alt": "Masala Fries"},
            {"name": "Peri-Peri Fries", "badges": [{"type": "spicy", "label": "Spicy"}], "prices": [89, 119], "priceNote": "Regular / Large", "img": "images/menu-peri-peri-fries.webp", "alt": "Peri Peri Fries"},
            {"name": "Cheese Fries", "prices": [109, 139], "priceNote": "Regular / Large", "img": "images/menu-cheese-fries.webp", "alt": "Cheese Fries"},
            {"name": "Loaded Fries", "desc": "Melted mozzarella, house sauces, chopped veggies.", "badges": [{"type": "best", "label": "Top Pick"}], "prices": [109, 149], "priceNote": "Regular / Large", "img": "images/menu-loaded-fries.webp", "alt": "Loaded Fries"}
          ]
        },
        {
          "id": "qb-springrolls", "title": "Spring Rolls", "items": [
            {"name": "Noodle Spring Roll", "prices": [79], "img": "images/menu-noodle-spring-roll.webp", "alt": "Noodle Spring Roll"},
            {"name": "Veg Spring Roll", "badges": [{"type": "veg", "label": "Veg"}], "prices": [89], "img": "images/menu-veg-spring-roll.webp", "alt": "Veg Spring Roll"},
            {"name": "Tandoori Spring Roll", "badges": [{"type": "spicy", "label": "Spicy"}], "prices": [99], "img": "images/menu-tandoori-spring-roll.webp", "alt": "Tandoori Spring Roll"},
            {"name": "Creamy Cheesy Spring Rolls", "prices": [109], "img": "images/menu-creamy-spring-roll.webp", "alt": "Creamy Spring Roll"}
          ]
        }
      ]
    },
    {
      "id": "pasta", "label": "Pasta",
      "categories": [
        {
          "title": "Pasta", "items": [
            {"name": "Napoli Pasta", "desc": "Red Sauce, Garlic, Coriander, Oregano, Tomatoes, Parmesan.", "prices": [129], "img": "images/menu-napoli-pasta.webp", "alt": "Napoli Pasta"},
            {"name": "Arrabiata Pasta", "desc": "Spicy Arrabiata Sauce, Red Chili, Garlic, Peppers, Black Olives.", "badges": [{"type": "spicy", "label": "Spicy"}], "prices": [129], "img": "images/menu-arrabiata-pasta.webp", "alt": "Arrabiata Pasta"},
            {"name": "Tandoori Pasta", "desc": "Tandoori Creamy Sauce, Capsicum, Onions, Grilled Sweet Corn.", "badges": [{"type": "best", "label": "Chef's Special"}], "prices": [129], "img": "images/menu-tandoori-pasta.webp", "alt": "Tandoori Pasta"},
            {"name": "Mix Sauce Pasta", "desc": "Red & White blend, Mushrooms, Bell Peppers, Olives, Mozzarella.", "prices": [139], "img": "images/menu-mix-sauce-pasta.webp", "alt": "Mix Sauce Pasta"},
            {"name": "Alfredo Pasta", "desc": "White Cheesy Sauce, Butter, Garlic, Mushrooms, Sweet Corn, Parmesan.", "prices": [149], "img": "images/menu-alfredo-pasta.webp", "alt": "Alfredo Pasta"}
          ]
        }
      ]
    },
    {
      "id": "garlicbread", "label": "Stuffed Garlic Bread",
      "categories": [
        {
          "title": "Stuffed Garlic Bread", "items": [
            {"name": "Cheesy Garlic Bread", "desc": "Freshly baked garlic bread, melted mozzarella.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [139, 199], "priceNote": "Single / Meal", "img": "images/menu-cheesy-garlic-bread.webp", "alt": "Cheesy Garlic Bread"},
            {"name": "Sweet Corn Garlic Bread", "desc": "Sweet corn, jalapeno, heavy layer of melted cheese.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [159, 219], "priceNote": "Single / Meal", "img": "images/menu-sweet-corn-garlic-bread.webp", "alt": "Sweet Corn Garlic Bread"},
            {"name": "Veggie Garlic Bread", "desc": "Crunchy capsicum, mushrooms, red onions, sweet corn, mozzarella.", "badges": [{"type": "veg", "label": "Veg"}], "prices": [189, 249], "priceNote": "Single / Meal", "img": "images/menu-veggie-garlic-bread.webp", "alt": "Veggie Garlic Bread"},
            {"name": "Paneer Garlic Bread", "desc": "Smoky paneer tikka OR tandoori sauce with spicy paprika, jalapeno, mozzarella.", "badges": [{"type": "veg", "label": "Veg"}, {"type": "spicy", "label": "Spicy"}], "prices": [209, 269], "priceNote": "Single / Meal", "img": "images/menu-paneer-garlic-bread.webp", "alt": "Paneer Garlic Bread", "flavorOptions": "Paneer Tikka|Tandoori Paneer"}
          ]
        }
      ]
    },
    {
      "id": "drinks", "label": "Drinks & Shakes",
      "categories": [
        {
          "id": "dr-hot", "title": "Hot Brews", "items": [
            {"name": "Masala Chai", "prices": [20], "img": "images/menu-masala-chai.webp", "alt": "Masala Chai"},
            {"name": "Elaichi Chai", "prices": [20], "img": "images/menu-masala-chai.webp", "alt": "Elaichi Chai"},
            {"name": "Adrak Chai", "prices": [20], "img": "images/menu-masala-chai.webp", "alt": "Adrak Chai"},
            {"name": "Hot Coffee (Frothy)", "prices": [50], "img": "images/menu-hot-coffee.webp", "alt": "Hot Coffee"}
          ]
        },
        {
          "id": "dr-chilled", "title": "Chilled Classics", "items": [
            {"name": "Mint Fresh Lime Soda", "prices": [49], "img": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=160&q=75&fit=crop", "alt": "Mint Fresh Lime Soda", "variant": {"baseName": "Mint Fresh Lime Soda", "cartPrice": 49, "default": "Salted", "options": ["Salted", "Sweet", "Mix"]}},
            {"name": "Lemon Cola", "prices": [70], "img": "images/menu-lemon-cola.webp", "alt": "Lemon Cola", "variant": {"baseName": "Lemon Cola", "cartPrice": 70, "default": "Salted", "options": ["Salted", "Sweet", "Mix", "Plain"]}},
            {"name": "Virgin Mojito", "prices": [89], "img": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=160&q=75&fit=crop", "alt": "Virgin Mojito", "variant": {"baseName": "Virgin Mojito", "cartPrice": 89, "default": "Salted", "options": ["Salted", "Sweet", "Mix"]}},
            {"name": "Blue Lagoon", "prices": [89], "img": "images/menu-blue-lagoon.webp", "alt": "Blue Lagoon", "variant": {"baseName": "Blue Lagoon", "cartPrice": 89, "default": "Sweet", "options": ["Salted", "Sweet", "Mix"]}}
          ]
        },
        {
          "id": "dr-shakes", "title": "Thick Shakes & Frappes", "items": [
            {"name": "Cold Coffee", "prices": [89], "img": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=160&q=75&fit=crop", "alt": "Cold Coffee"},
            {"name": "Strawberry Bliss", "prices": [99], "img": "images/menu-strawberry-shake.webp", "alt": "Strawberry Shake"},
            {"name": "Vanilla Shake", "prices": [99], "img": "images/menu-vanilla-shake.webp", "alt": "Vanilla Shake"},
            {"name": "Chocolate Shake", "prices": [109], "img": "images/menu-chocolate-shake.webp", "alt": "Chocolate Shake"},
            {"name": "Butterscotch Shake", "prices": [109], "img": "images/menu-butterscotch-shake.webp", "alt": "Butterscotch Shake"},
            {"name": "Oreo Crumble Shake", "badges": [{"type": "best", "label": "Fan Favourite"}], "prices": [119], "img": "images/menu-oreo-shake.webp", "alt": "Oreo Shake"},
            {"name": "KitKat Break Shake", "badges": [{"type": "best", "label": "Fan Favourite"}], "prices": [119], "img": "images/menu-kitkat-shake.webp", "alt": "KitKat Shake"}
          ]
        }
      ]
    },
    {
      "id": "quickdrinks", "label": "Quick Drinks",
      "categories": [
        {
          "title": "Pops", "items": [
            {"name": "Coke", "prices": [20, 40, 90], "priceNote": "250ml / 750ml / 2L", "img": "images/menu-coke.webp", "alt": "Coke"},
            {"name": "Canned Coke", "prices": [30, 40], "priceNote": "200ml / 300ml", "img": "images/menu-canned-coke.webp", "alt": "Canned Coke"}
          ]
        },
        {
          "title": "Water", "items": [
            {"name": "Water 250ml", "prices": [5], "img": "images/menu-water-250ml.webp", "alt": "Water 250ml"},
            {"name": "Water 1L", "prices": [20], "img": "images/menu-water-1l.webp", "alt": "Water 1L"}
          ]
        }
      ]
    }
  ]
};
