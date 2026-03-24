import React from 'react';

export default function ProductCard({ product, onEdit, onDelete, currentUser }) {
    const renderStars = (rating) => {
        const safeRating = Math.max(0, Math.min(5, Math.floor(rating || 0)));
        const stars = '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
        return stars;
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
    };

    const canEdit = currentUser && (currentUser.role === 'seller' || currentUser.role === 'admin');
    const canDelete = currentUser && currentUser.role === 'admin';
    const canView = currentUser;

    const defaultImage = "https://picsum.photos/id/20/300/200";

    return (
        <div className="productCard">
            <div className="productCard__image">
                <img 
                    src={product.image || defaultImage} 
                    alt={product.name}
                    onError={(e) => { e.target.src = defaultImage; }}
                />
            </div>
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
                {canView && (
                    <button 
                        className="btn btn--small" 
                        onClick={() => window.location.href = `/product/${product.id}`}
                    >
                        Просмотр
                    </button>
                )}
                {canEdit && (
                    <button 
                        className="btn btn--small" 
                        onClick={() => onEdit(product)}
                    >
                        Редактировать
                    </button>
                )}
                {canDelete && (
                    <button 
                        className="btn btn--small btn--danger" 
                        onClick={() => onDelete(product.id)}
                    >
                        Удалить
                    </button>
                )}
            </div>
        </div>
    );
}