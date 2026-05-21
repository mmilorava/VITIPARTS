import { getPartPlaceholder } from "../services/placeholders";
import {
  translateCategory,
  translateCondition,
} from "../services/catalogLabels";
import { resolveImageUrl } from "../services/images";

function formatPrice(price) {
  const safePrice = Number(price) || 0;
  return `${safePrice.toLocaleString("ka-GE")} ლ`;
}

function PartCard({ part }) {
  const partImage =
    resolveImageUrl(part.image) ||
    getPartPlaceholder(part.code || part.name);
  const partDescription =
    part.description?.trim() || "ამ მანქანისთვის განკუთვნილი კატალოგის ნაწილი.";

  return (
    <article className="part-card">
      <div className="part-card-media">
        <img src={partImage} alt={part.name} />
      </div>

      <div className="part-card-body">
        <div className="part-card-topline">
          <span className="part-card-code">{part.code}</span>
          <span className="part-card-condition">
            {translateCondition(part.condition)}
          </span>
        </div>
        <h3 className="part-card-name">{part.name}</h3>
        <p className="part-card-meta">{translateCategory(part.category)}</p>
        <p className="part-card-description">{partDescription}</p>
        <p className="part-card-price">{formatPrice(part.price)}</p>
      </div>
    </article>
  );
}

export default PartCard;
