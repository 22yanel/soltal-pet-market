export type Product = {
  id: number;
  name: string;
  category: string;
  subCategory: string;
  price: number;
  stock: number;
  image: string;
  description: string;
};

export const categories = ["Perros", "Gatos", "Caballos", "Vacas", "Cerdos", "Aves", "Conejos", "Shampoo y cuidado", "Antipulgas", "Accesorios"];

export const products: Product[] = [
  { id: 1, name: "Alimento para perros adultos", category: "Perros", subCategory: "Alimentos", price: 2500, stock: 20, image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=900&auto=format&fit=crop", description: "Alimento completo para perros adultos." },
  { id: 2, name: "Pelota resistente para perros", category: "Perros", subCategory: "Juguetes", price: 450, stock: 30, image: "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?q=80&w=900&auto=format&fit=crop", description: "Juguete resistente para perros activos." },
  { id: 3, name: "Alimento para gatos", category: "Gatos", subCategory: "Alimentos", price: 1450, stock: 17, image: "https://images.unsplash.com/photo-1511044568932-338cba0ad803?q=80&w=900&auto=format&fit=crop", description: "Alimento seco para gatos." },
  { id: 4, name: "Suplemento para caballos", category: "Caballos", subCategory: "Alimentos", price: 3200, stock: 8, image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=900&auto=format&fit=crop", description: "Suplemento para alimentación de caballos." },
  { id: 5, name: "Minerales para vacas", category: "Vacas", subCategory: "Alimentos", price: 1800, stock: 12, image: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=900&auto=format&fit=crop", description: "Complemento mineral para ganado bovino." },
  { id: 6, name: "Alimento para cerdos", category: "Cerdos", subCategory: "Alimentos", price: 2100, stock: 9, image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=900&auto=format&fit=crop", description: "Alimento para cerdos." },
  { id: 7, name: "Shampoo y cuidado animal", category: "Shampoo y cuidado", subCategory: "Cuidado", price: 550, stock: 35, image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=900&auto=format&fit=crop", description: "Producto de higiene para animales." },
  { id: 8, name: "Collar y correa resistente", category: "Accesorios", subCategory: "Accesorios", price: 650, stock: 20, image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=900&auto=format&fit=crop", description: "Collar y correa para paseos." }
];
