import React from 'react';

export default function ProductCard({ product, onEdit, onDelete }) {
    const renderStars = (rating) => {
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        return stars;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
    };

    return (
        <div className="productCard">
            <div className="productCard__header">
                <h3 className="productCard__name">{product.name}</h3>
                <span className="productCard__category">{product.category}</span>
            </div>
            
            <p className="productCard__description">{product.description}</p>
            
            <div className="productCard__details">
                <div className="productCard__price">
                    {formatPrice(product.price)}
                    <small>за шт.</small>
                </div>
                <div className="productCard__stock">
                    {product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии'}
                </div>
            </div>
            
            {product.rating > 0 && (
                <div className="productCard__rating">
                    <span className="stars">{renderStars(product.rating)}</span>
                    <span className="value">{product.rating.toFixed(1)}</span>
                </div>
            )}
            
            <div className="productCard__actions">
                <button 
                    className="btn btn--small" 
                    onClick={() => onEdit(product)}
                >
                    ✏️ Редактировать
                </button>
                <button 
                    className="btn btn--small btn--danger" 
                    onClick={() => onDelete(product.id)}
                >
                    🗑️ Удалить
                </button>
            </div>
        </div>
    );
}