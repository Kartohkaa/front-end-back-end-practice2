import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onEdit, onDelete, currentUser }) {
    if (!products.length) {
        return (
            <div className="empty">
                🛒 Товаров пока нет. Создайте первый товар!
            </div>
        );
    }

    return (
        <div className="productsGrid">
            {products.map((product) => (
                <ProductCard 
                    key={product.id} 
                    product={product} 
                    onEdit={onEdit} 
                    onDelete={onDelete}
                    currentUser={currentUser} 
                />
            ))}
        </div>
    );
}