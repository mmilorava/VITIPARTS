import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import PartCard from "../components/PartCard";
import { translateCategory } from "../services/catalogLabels";
import {
  getApiErrorMessage,
  getCarById,
  getPartsByCarId,
} from "../services/api";
import { resolveImageUrl } from "../services/images";
import { getBannerPlaceholder } from "../services/placeholders";

function CarPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [car, setCar] = useState(null);
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const searchTerm = searchParams.get("search")?.trim() || "";
  const normalizedSearch = searchTerm.toLowerCase();

  useEffect(() => {
    let isMounted = true;

    const loadCarPage = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [carData, partsData] = await Promise.all([
          getCarById(id),
          getPartsByCarId(id),
        ]);

        if (isMounted) {
          setCar(carData);
          setParts(partsData);
          setActiveCategory("All");
        }
      } catch (requestError) {
        if (isMounted) {
          setCar(null);
          setParts([]);
          setError(
            getApiErrorMessage(
              requestError,
              "მანქანის და მისი ნაწილების ჩატვირთვა ვერ მოხერხდა."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadCarPage();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const resolvedCarImage = resolveImageUrl(car?.image);
  const bannerImage = resolvedCarImage
    ? resolvedCarImage
    : getBannerPlaceholder(car ? `${car.brand} ${car.model}` : "CAR DETAILS");

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      parts.map((part) => part.category?.trim()).filter(Boolean)
    );

    return ["All", ...Array.from(uniqueCategories)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesCategory =
        activeCategory === "All" || part.category === activeCategory;
      const searchableText = [
        part.name,
        part.code,
        part.category,
        part.condition,
        part.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, normalizedSearch, parts]);

  const backPath = car?.brandId ? `/brands/${car.brandId}` : "/";

  return (
    <section className="page-section">
      <div className="container">
        <Link to={backPath} className="back-link">
          უკან დაბრუნება
        </Link>

        {isLoading ? (
          <div className="status-panel">
            <h3>მანქანის გვერდი იტვირთება...</h3>
            <p>სისტემა არჩეული მანქანის ინფორმაციას და მის ნაწილებს ითხოვს.</p>
          </div>
        ) : error ? (
          <div className="status-panel status-panel-error">
            <h3>კატალოგის გვერდი ვერ ჩაიტვირთა</h3>
            <p>{error}</p>
            <p className="status-note">
              დარწმუნდით, რომ backend სერვერი მუშაობს და ეს მანქანა მონაცემთა
              ბაზაში არსებობს.
            </p>
          </div>
        ) : car ? (
          <>
            <section className="car-detail-shell">
              <div className="car-banner">
                <div className="car-banner-image is-vehicle">
                  <img src={bannerImage} alt={`${car.brand} ${car.model}`} />
                </div>

                <div className="car-info">
                  <p className="eyebrow">{car.brand}</p>
                  <h1>{car.model}</h1>
                  <p className="car-year">{car.year}</p>
                  <p className="car-description">
                    {car.description || ""}
                  </p>
                </div>
              </div>
            </section>

            <div className="section-heading">
              <div>
                <p className="eyebrow">ნაწილების კატალოგი</p>
               
              </div>
              
            </div>

            {parts.length > 0 ? (
              <>
                <div className="filter-toolbar">
                  <div className="filter-toolbar-copy">
                    
                  </div>

                  <div className="filter-pills">
                    {categories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={`filter-pill ${
                          activeCategory === category ? "is-active" : ""
                        }`}
                        onClick={() => setActiveCategory(category)}
                      >
                        {translateCategory(category)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="parts-toolbar">
                  <p className="parts-summary">
                    ნაჩვენებია <strong>{filteredParts.length}</strong> /{" "}
                    <strong>{parts.length}</strong> ნაწილი
                    {activeCategory !== "All"
                      ? ` კატეგორიაში: ${translateCategory(activeCategory)}`
                      : ""}
                    {searchTerm ? ` ძიებისთვის: "${searchTerm}"` : ""}.
                  </p>
                </div>

                {filteredParts.length > 0 ? (
                  <div className="parts-grid">
                    {filteredParts.map((part) => (
                      <PartCard key={part._id || part.id} part={part} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>არჩეულ ფილტრების შესაბამისი ნაწილები ვერ მოიძებნა</h3>
                    <p>
                      სცადეთ სხვა კატეგორია 
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <h3>ნაწილები ვერ მოიძებნა</h3>
                <p>ნაწილები ჯერ არ არის დამატებული.</p>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>მანქანა ვერ მოიძებნა</h3>
            <p>მოთხოვნილი მანქანა ვერ მოიძებნა.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default CarPage;
