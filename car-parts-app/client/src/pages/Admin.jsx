import { useEffect, useMemo, useState } from "react";

import {
  clearStoredAdminToken,
  hasStoredAdminToken,
  setStoredAdminToken,
} from "../services/auth";
import {
  createBrand,
  createCar,
  createPartForCar,
  deleteBrandById,
  deleteCarById,
  deletePartById,
  getAdminSession,
  getApiErrorMessage,
  getBrands,
  getCars,
  getPartsByCarId,
  isUnauthorizedError,
  loginAdmin,
  reorderBrands,
  reorderCars,
  reorderPartsForCar,
  updateBrandById,
  updateCarById,
  updatePartById,
} from "../services/api";
import {
  translateCategory,
  translateCondition,
} from "../services/catalogLabels";
import { prepareImageUpload, resolveImageUrl } from "../services/images";
import { getBrandPlaceholder, getCarPlaceholder } from "../services/placeholders";

const initialBrandForm = {
  name: "",
  image: "",
  description: "",
};

const initialCarForm = {
  brandId: "",
  model: "",
  year: "",
  image: "",
  description: "",
};

const initialPartForm = {
  name: "",
  code: "",
  price: "",
  category: "Body",
  condition: "Used",
  image: "",
  description: "",
};

const initialLoginForm = {
  username: "admin",
  password: "",
};

const categories = ["Body", "Interior"];
const conditions = ["New", "Used", "Refurbished"];

const moveItemInList = (items, draggedId, targetId) => {
  const sourceIndex = items.findIndex((item) => item._id === draggedId);
  const targetIndex = items.findIndex((item) => item._id === targetId);

  if (
    sourceIndex === -1 ||
    targetIndex === -1 ||
    sourceIndex === targetIndex
  ) {
    return null;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(sourceIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);

  return nextItems;
};

function ImageUploadField({ label, image, onChange, onClear }) {
  const hasImage = Boolean(image);

  return (
    <div className="admin-field admin-field-full">
      <span>{label}</span>
      <label className={`admin-upload-field ${hasImage ? "has-image" : ""}`}>
        <input
          className="admin-upload-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onChange}
        />

        <div className="admin-upload-preview">
          {hasImage ? (
            <img src={image} alt="" />
          ) : (
            <div className="admin-upload-placeholder">
              <strong>დააჭირეთ ასატვირთად</strong>
              <span>PNG, JPG ან WEBP</span>
            </div>
          )}
        </div>

        <div className="admin-upload-copy">
          <strong>
            {hasImage
              ? "სურათი არჩეულია"
              : "აირჩიეთ სურათი თქვენი კომპიუტერიდან"}
          </strong>
          <p>
            {hasImage
              ? "დააჭირეთ, თუ გსურთ ჩანაცვლება."
              : "გამოიყენეთ PNG, JPG ან WEBP ფაილი 5 მბ-მდე."}
          </p>
        </div>
      </label>

      {hasImage ? (
        <button
          type="button"
          className="admin-upload-clear"
          onClick={onClear}
        >
          სურათის წაშლა
        </button>
      ) : null}
    </div>
  );
}

function Admin() {
  const [brands, setBrands] = useState([]);
  const [cars, setCars] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [brandForm, setBrandForm] = useState(initialBrandForm);
  const [carForm, setCarForm] = useState(initialCarForm);
  const [partForm, setPartForm] = useState(initialPartForm);
  const [editingBrandId, setEditingBrandId] = useState("");
  const [editingCarId, setEditingCarId] = useState("");
  const [editingPartId, setEditingPartId] = useState("");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [carsLoading, setCarsLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [submittingBrand, setSubmittingBrand] = useState(false);
  const [submittingCar, setSubmittingCar] = useState(false);
  const [submittingPart, setSubmittingPart] = useState(false);
  const [reorderingBrands, setReorderingBrands] = useState(false);
  const [reorderingCars, setReorderingCars] = useState(false);
  const [reorderingParts, setReorderingParts] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [dragState, setDragState] = useState({
    type: "",
    itemId: "",
    overId: "",
  });

  const selectedCar = useMemo(
    () => cars.find((car) => car._id === selectedCarId) || null,
    [cars, selectedCarId]
  );

  const brandCarCounts = useMemo(() => {
    return cars.reduce((counts, car) => {
      const key = car.brandId || car.brand;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [cars]);

  const resetBrandForm = () => {
    setBrandForm(initialBrandForm);
    setEditingBrandId("");
  };

  const resetCarForm = () => {
    setCarForm((currentForm) => ({
      ...initialCarForm,
      brandId: currentForm.brandId || brands[0]?._id || "",
    }));
    setEditingCarId("");
  };

  const resetPartForm = () => {
    setPartForm(initialPartForm);
    setEditingPartId("");
  };

  const resetAdminState = () => {
    setBrands([]);
    setCars([]);
    setParts([]);
    setSelectedCarId("");
    resetBrandForm();
    setCarForm(initialCarForm);
    setEditingCarId("");
    setPartForm(initialPartForm);
    setEditingPartId("");
    setPageError("");
    setNotice("");
    setReorderingBrands(false);
    setReorderingCars(false);
    setReorderingParts(false);
    setDragState({
      type: "",
      itemId: "",
      overId: "",
    });
  };

  const logoutAdminUser = (message = "") => {
    clearStoredAdminToken();
    setIsAuthenticated(false);
    setAdminUsername("");
    setAuthSubmitting(false);
    setAuthChecking(false);
    setAuthError(message);
    resetAdminState();
  };

  const handleProtectedError = (error, fallbackMessage) => {
    if (isUnauthorizedError(error)) {
      logoutAdminUser("ადმინის სესია ამოიწურა. გთხოვთ თავიდან შეხვიდეთ.");
      return;
    }

    setPageError(getApiErrorMessage(error, fallbackMessage));
  };

  const loadBrands = async (preferredBrandId = "") => {
    try {
      setBrandsLoading(true);
      setPageError("");

      const brandsData = await getBrands();
      setBrands(brandsData);

      setCarForm((currentForm) => {
        const fallbackBrandId =
          preferredBrandId || currentForm.brandId || brandsData[0]?._id || "";
        const matchingBrand = brandsData.find(
          (brand) => brand._id === fallbackBrandId
        );

        return {
          ...currentForm,
          brandId: matchingBrand ? matchingBrand._id : brandsData[0]?._id || "",
        };
      });
    } catch (error) {
      handleProtectedError(error, "ბრენდების ჩატვირთვა ვერ მოხერხდა.");
    } finally {
      setBrandsLoading(false);
    }
  };

  const loadCars = async (preferredCarId = "") => {
    try {
      setCarsLoading(true);
      setPageError("");

      const carsData = await getCars();
      setCars(carsData);

      if (carsData.length === 0) {
        setSelectedCarId("");
        return;
      }

      const fallbackSelectedId = preferredCarId || selectedCarId;
      const nextSelectedCar =
        carsData.find((car) => car._id === fallbackSelectedId) || carsData[0];

      setSelectedCarId(nextSelectedCar._id);
    } catch (error) {
      handleProtectedError(error, "მანქანების სიის ჩატვირთვა ვერ მოხერხდა.");
    } finally {
      setCarsLoading(false);
    }
  };

  const loadParts = async (carId) => {
    if (!carId) {
      setParts([]);
      return;
    }

    try {
      setPartsLoading(true);
      setPageError("");

      const partsData = await getPartsByCarId(carId);
      setParts(partsData);
    } catch (error) {
      handleProtectedError(error, "ამ მანქანის ნაწილების ჩატვირთვა ვერ მოხერხდა.");
      setParts([]);
    } finally {
      setPartsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const validateStoredSession = async () => {
      if (!hasStoredAdminToken()) {
        if (isMounted) {
          setAuthChecking(false);
        }
        return;
      }

      try {
        const session = await getAdminSession();

        if (isMounted) {
          setIsAuthenticated(true);
          setAdminUsername(session.username);
          setAuthError("");
        }
      } catch (error) {
        if (isMounted) {
          logoutAdminUser("გთხოვთ შეხვიდეთ ადმინის სივრცეში.");
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    };

    validateStoredSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadBrands();
    loadCars();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    resetPartForm();
    loadParts(selectedCarId);
  }, [isAuthenticated, selectedCarId]);

  const handleLoginFormChange = (event) => {
    const { name, value } = event.target;

    setLoginForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleBrandFormChange = (event) => {
    const { name, value } = event.target;

    setBrandForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCarFormChange = (event) => {
    const { name, value } = event.target;

    setCarForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handlePartFormChange = (event) => {
    const { name, value } = event.target;

    setPartForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleImageUpload = async (event, setForm) => {
    const selectedFile = event.target.files?.[0];

    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    try {
      setPageError("");
      setNotice("");

      const preparedImage = await prepareImageUpload(selectedFile);

      setForm((currentForm) => ({
        ...currentForm,
        image: preparedImage,
      }));
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "სურათის დამუშავება ვერ მოხერხდა."
      );
    }
  };

  const clearSelectedImage = (setForm) => {
    setPageError("");

    setForm((currentForm) => ({
      ...currentForm,
      image: "",
    }));
  };

  const handleBrandImageChange = (event) =>
    handleImageUpload(event, setBrandForm);

  const handleCarImageChange = (event) => handleImageUpload(event, setCarForm);

  const handlePartImageChange = (event) =>
    handleImageUpload(event, setPartForm);

  const clearBrandImage = () => clearSelectedImage(setBrandForm);
  const clearCarImage = () => clearSelectedImage(setCarForm);
  const clearPartImage = () => clearSelectedImage(setPartForm);

  const handleEditBrand = (brand) => {
    setEditingBrandId(brand._id);
    setBrandForm({
      name: brand.name || "",
      image: brand.image || "",
      description: brand.description || "",
    });
    setPageError("");
    setNotice("");
  };

  const handleEditCar = (car) => {
    setEditingCarId(car._id);
    setCarForm({
      brandId: car.brandId || "",
      model: car.model || "",
      year: car.year || "",
      image: car.image || "",
      description: car.description || "",
    });
    setSelectedCarId(car._id);
    setPageError("");
    setNotice("");
  };

  const handleEditPart = (part) => {
    setEditingPartId(part._id);
    setPartForm({
      name: part.name || "",
      code: part.code || "",
      price: part.price != null ? String(part.price) : "",
      category: part.category || initialPartForm.category,
      condition: part.condition || initialPartForm.condition,
      image: part.image || "",
      description: part.description || "",
    });
    setPageError("");
    setNotice("");
  };

  const handleCancelBrandEdit = () => {
    resetBrandForm();
    setPageError("");
    setNotice("");
  };

  const handleCancelCarEdit = () => {
    resetCarForm();
    setPageError("");
    setNotice("");
  };

  const handleCancelPartEdit = () => {
    resetPartForm();
    setPageError("");
    setNotice("");
  };

  const resetDragState = () => {
    setDragState({
      type: "",
      itemId: "",
      overId: "",
    });
  };

  const handleDragStart = (type, itemId) => {
    setDragState({
      type,
      itemId,
      overId: itemId,
    });
  };

  const handleDragOver = (event, type, overId) => {
    if (dragState.type !== type) {
      return;
    }

    event.preventDefault();

    setDragState((currentState) =>
      currentState.type === type && currentState.overId !== overId
        ? {
            ...currentState,
            overId,
          }
        : currentState
    );
  };

  const getDraggableItemClassName = (baseClassName, type, itemId, extra = "") =>
    [
      baseClassName,
      extra,
      dragState.type === type && dragState.itemId === itemId
        ? "is-dragging"
        : "",
      dragState.type === type &&
      dragState.overId === itemId &&
      dragState.itemId !== itemId
        ? "is-drag-over"
        : "",
    ]
      .filter(Boolean)
      .join(" ");

  const handleBrandDrop = async (event, targetBrandId) => {
    event.preventDefault();

    if (dragState.type !== "brands") {
      return;
    }

    const previousBrands = brands;
    const nextBrands = moveItemInList(brands, dragState.itemId, targetBrandId);

    resetDragState();

    if (!nextBrands) {
      return;
    }

    try {
      setReorderingBrands(true);
      setPageError("");
      setNotice("");
      setBrands(nextBrands);

      const updatedBrands = await reorderBrands(
        nextBrands.map((brand) => brand._id)
      );

      setBrands(updatedBrands);
      setNotice("ბრენდების თანმიმდევრობა განახლდა.");
    } catch (error) {
      setBrands(previousBrands);
      handleProtectedError(error, "ბრენდების თანმიმდევრობის შეცვლა ვერ მოხერხდა.");
    } finally {
      setReorderingBrands(false);
    }
  };

  const handleCarDrop = async (event, targetCarId) => {
    event.preventDefault();

    if (dragState.type !== "cars") {
      return;
    }

    const previousCars = cars;
    const nextCars = moveItemInList(cars, dragState.itemId, targetCarId);

    resetDragState();

    if (!nextCars) {
      return;
    }

    try {
      setReorderingCars(true);
      setPageError("");
      setNotice("");
      setCars(nextCars);

      const updatedCars = await reorderCars(nextCars.map((car) => car._id));

      setCars(updatedCars);
      setNotice("მანქანების თანმიმდევრობა განახლდა.");
    } catch (error) {
      setCars(previousCars);
      handleProtectedError(error, "მანქანების თანმიმდევრობის შეცვლა ვერ მოხერხდა.");
    } finally {
      setReorderingCars(false);
    }
  };

  const handlePartDrop = async (event, targetPartId) => {
    event.preventDefault();

    if (dragState.type !== "parts" || !selectedCarId) {
      return;
    }

    const previousParts = parts;
    const nextParts = moveItemInList(parts, dragState.itemId, targetPartId);

    resetDragState();

    if (!nextParts) {
      return;
    }

    try {
      setReorderingParts(true);
      setPageError("");
      setNotice("");
      setParts(nextParts);

      const updatedParts = await reorderPartsForCar(
        selectedCarId,
        nextParts.map((part) => part._id)
      );

      setParts(updatedParts);
      setNotice("ნაწილების თანმიმდევრობა განახლდა.");
    } catch (error) {
      setParts(previousParts);
      handleProtectedError(error, "ნაწილების თანმიმდევრობის შეცვლა ვერ მოხერხდა.");
    } finally {
      setReorderingParts(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setAuthSubmitting(true);
      setAuthError("");

      const session = await loginAdmin(loginForm);

      setStoredAdminToken(session.token);
      setIsAuthenticated(true);
      setAdminUsername(session.username);
      setLoginForm((currentForm) => ({
        ...currentForm,
        password: "",
      }));
    } catch (error) {
      setAuthError(
        getApiErrorMessage(error, "ადმინის სივრცეში შესვლა ვერ მოხერხდა.")
      );
    } finally {
      setAuthSubmitting(false);
      setAuthChecking(false);
    }
  };

  const handleLogout = () => {
    logoutAdminUser("ადმინის პროფილიდან გამოხვედით.");
  };

  const handleCreateBrand = async (event) => {
    event.preventDefault();

    try {
      setSubmittingBrand(true);
      setPageError("");
      setNotice("");

      if (editingBrandId) {
        const updatedBrand = await updateBrandById(editingBrandId, brandForm);

        resetBrandForm();
        setNotice(`ბრენდი "${updatedBrand.name}" განახლდა.`);
        await loadBrands(updatedBrand._id);
        await loadCars(selectedCarId);
      } else {
        const createdBrand = await createBrand(brandForm);

        resetBrandForm();
        setNotice(`ბრენდი "${createdBrand.name}" წარმატებით დაემატა.`);
        await loadBrands(createdBrand._id);
        await loadCars();
      }
    } catch (error) {
      handleProtectedError(
        error,
        editingBrandId
          ? "ბრენდის განახლება ვერ მოხერხდა."
          : "ბრენდის დამატება ვერ მოხერხდა."
      );
    } finally {
      setSubmittingBrand(false);
    }
  };

  const handleCreateCar = async (event) => {
    event.preventDefault();

    try {
      setSubmittingCar(true);
      setPageError("");
      setNotice("");

      if (editingCarId) {
        const updatedCar = await updateCarById(editingCarId, carForm);

        resetCarForm();
        setNotice(`მანქანა "${updatedCar.brand} ${updatedCar.model}" განახლდა.`);
        await loadCars(updatedCar._id);
      } else {
        const createdCar = await createCar(carForm);

        resetCarForm();
        setCarForm((currentForm) => ({
          ...currentForm,
          brandId: createdCar.brandId || carForm.brandId,
        }));
        setNotice(`მანქანა "${createdCar.brand} ${createdCar.model}" დაემატა.`);
        await loadCars(createdCar._id);
      }
    } catch (error) {
      handleProtectedError(
        error,
        editingCarId
          ? "მანქანის განახლება ვერ მოხერხდა."
          : "მანქანის დამატება ვერ მოხერხდა."
      );
    } finally {
      setSubmittingCar(false);
    }
  };

  const handleDeleteBrand = async (brand) => {
    const shouldDelete = window.confirm(
      `ნამდვილად გსურთ "${brand.name}" ბრენდის წაშლა? მასთან დაკავშირებული მანქანები და ნაწილებიც წაიშლება.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPageError("");
      setNotice("");

      await deleteBrandById(brand._id);

      if (editingBrandId === brand._id) {
        resetBrandForm();
      }

      setNotice(`ბრენდი "${brand.name}" წაიშალა.`);
      await loadBrands();
      await loadCars();
    } catch (error) {
      handleProtectedError(error, "ბრენდის წაშლა ვერ მოხერხდა.");
    }
  };

  const handleDeleteCar = async (car) => {
    const shouldDelete = window.confirm(
      `ნამდვილად გსურთ ${car.brand} ${car.model}-ის წაშლა? მასთან დაკავშირებული ნაწილებიც წაიშლება.`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPageError("");
      setNotice("");

      await deleteCarById(car._id);

      if (editingCarId === car._id) {
        resetCarForm();
      }

      setNotice(`მანქანა "${car.brand} ${car.model}" წაიშალა.`);
      await loadCars(car._id === selectedCarId ? "" : selectedCarId);
    } catch (error) {
      handleProtectedError(error, "მანქანის წაშლა ვერ მოხერხდა.");
    }
  };

  const handleCreatePart = async (event) => {
    event.preventDefault();

    if (!selectedCarId) {
      return;
    }

    try {
      setSubmittingPart(true);
      setPageError("");
      setNotice("");

      const formattedPartForm = {
        ...partForm,
        price: Number(partForm.price),
      };

      if (editingPartId) {
        await updatePartById(editingPartId, formattedPartForm);
        resetPartForm();
        setNotice("ნაწილი განახლდა.");
      } else {
        await createPartForCar(selectedCarId, formattedPartForm);
        resetPartForm();
        setNotice("ნაწილი წარმატებით დაემატა არჩეულ მანქანას.");
      }

      await loadParts(selectedCarId);
    } catch (error) {
      handleProtectedError(
        error,
        editingPartId
          ? "ნაწილის განახლება ვერ მოხერხდა."
          : "ნაწილის დამატება ვერ მოხერხდა."
      );
    } finally {
      setSubmittingPart(false);
    }
  };

  const handleDeletePart = async (part) => {
    const shouldDelete = window.confirm(
      `ნამდვილად გსურთ "${part.name}" ნაწილის წაშლა?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setPageError("");
      setNotice("");

      await deletePartById(part._id);

      if (editingPartId === part._id) {
        resetPartForm();
      }

      setNotice(`ნაწილი "${part.name}" წაიშალა.`);
      await loadParts(selectedCarId);
    } catch (error) {
      handleProtectedError(error, "ნაწილის წაშლა ვერ მოხერხდა.");
    }
  };

  const brandFormImage = brandForm.image ? resolveImageUrl(brandForm.image) : "";
  const carFormImage = carForm.image ? resolveImageUrl(carForm.image) : "";
  const partFormImage = partForm.image ? resolveImageUrl(partForm.image) : "";
  const selectedCarImage = selectedCar
    ? resolveImageUrl(selectedCar.image) ||
      getCarPlaceholder(`${selectedCar.brand} ${selectedCar.model}`)
    : getCarPlaceholder("აირჩიეთ მანქანა");

  if (authChecking) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="status-panel">
            <h3>ადმინის წვდომა მოწმდება...</h3>
            <p>სისტემა ამოწმებს, გაქვთ თუ არა აქტიური ადმინის სესია.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="page-section">
        <div className="container">
          <div className="auth-shell">
            <section className="auth-card">
              <p className="eyebrow">ადმინის შესვლა</p>
              <h1>კატალოგის მართვა მხოლოდ თქვენ შეგიძლიათ</h1>
              <p>
                მომხმარებლებს შეუძლიათ ბრენდების, მანქანებისა და ნაწილების
                ნახვა, მაგრამ დამატება, შეცვლა და წაშლა მხოლოდ ადმინის ანგარიშით
                არის შესაძლებელი.
              </p>

              {authError ? (
                <div className="auth-error">
                  <strong>წვდომა უარყოფილია</strong>
                  <p>{authError}</p>
                </div>
              ) : null}

              <form className="auth-form" onSubmit={handleLogin}>
                <label className="admin-field">
                  <span>მომხმარებლის სახელი</span>
                  <input
                    name="username"
                    value={loginForm.username}
                    onChange={handleLoginFormChange}
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>პაროლი</span>
                  <input
                    name="password"
                    type="password"
                    value={loginForm.password}
                    onChange={handleLoginFormChange}
                    required
                  />
                </label>

                <button
                  className="admin-button"
                  type="submit"
                  disabled={authSubmitting}
                >
                  {authSubmitting ? "შესვლა მიმდინარეობს..." : "შესვლა"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <section className="placeholder-panel admin-intro admin-intro-bar">
          <div>
            <p className="eyebrow">ადმინი</p>
            <h1>ბრენდების, მანქანებისა და ნაწილების მართვა</h1>
            <p>
              სისტემაში შესულია: <strong>{adminUsername}</strong>
            </p>
          </div>

          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={handleLogout}
          >
            გამოსვლა
          </button>
        </section>

        {notice ? (
          <div className="status-panel admin-notice">
            <h3>ცვლილება შენახულია</h3>
            <p>{notice}</p>
          </div>
        ) : null}

        {pageError ? (
          <div className="status-panel status-panel-error">
            <h3>მოთხოვნა ვერ შესრულდა</h3>
            <p>{pageError}</p>
          </div>
        ) : null}

        <div className="admin-layout">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">ბრენდის დამატება</p>
                <h2>ახალი ბრენდის შექმნა</h2>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleCreateBrand}>
              <label className="admin-field">
                <span>ბრენდის სახელი</span>
                <input
                  name="name"
                  value={brandForm.name}
                  onChange={handleBrandFormChange}
                  placeholder="Mercedes-Benz"
                  required
                />
              </label>

              <ImageUploadField
                label="ბრენდის სურათი"
                image={brandFormImage}
                onChange={handleBrandImageChange}
                onClear={clearBrandImage}
              />

              <label className="admin-field admin-field-full">
                <span>აღწერა</span>
                <textarea
                  name="description"
                  value={brandForm.description}
                  onChange={handleBrandFormChange}
                  rows="4"
                  placeholder="ბრენდის მოკლე აღწერა"
                />
              </label>

              <div className="admin-form-actions admin-field-full">
                <button
                  className="admin-button"
                  type="submit"
                  disabled={submittingBrand}
                >
                  {submittingBrand
                    ? editingBrandId
                      ? "ბრენდი ახლდება..."
                      : "ბრენდი ემატება..."
                    : editingBrandId
                      ? "ბრენდის შენახვა"
                      : "ბრენდის დამატება"}
                </button>
                {editingBrandId ? (
                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    onClick={handleCancelBrandEdit}
                    disabled={submittingBrand}
                  >
                    გაუქმება
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">ბრენდები</p>
                <h2>შენახული ბრენდები</h2>
              </div>
              <span className="admin-count">სულ {brands.length}</span>
            </div>

            {brandsLoading ? (
              <div className="admin-empty">
                <h3>ბრენდები იტვირთება...</h3>
                <p>ადმინის გვერდი ბრენდების სიას ითხოვს.</p>
              </div>
            ) : brands.length > 0 ? (
              <div className="admin-list">
                {brands.map((brand) => {
                  const brandImage =
                    resolveImageUrl(brand.image) ||
                    getBrandPlaceholder(brand.name);
                  const carCount = brandCarCounts[brand._id] || 0;

                  return (
                    <article
                      key={brand._id}
                      className={getDraggableItemClassName(
                        "admin-car-item",
                        "brands",
                        brand._id
                      )}
                      draggable={!reorderingBrands}
                      onDragStart={() => handleDragStart("brands", brand._id)}
                      onDragOver={(event) =>
                        handleDragOver(event, "brands", brand._id)
                      }
                      onDrop={(event) => handleBrandDrop(event, brand._id)}
                      onDragEnd={resetDragState}
                    >
                      <div className="admin-brand-thumb">
                        <img src={brandImage} alt={brand.name} />
                      </div>

                      <div className="admin-car-summary">
                        <h3>{brand.name}</h3>
                        <p>
                          ამ ბრენდში {carCount} მანქანაა დამატებული
                        </p>
                      </div>

                      <div className="admin-car-actions">
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() => handleEditBrand(brand)}
                          disabled={reorderingBrands}
                        >
                          რედაქტირება
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          onClick={() => handleDeleteBrand(brand)}
                          disabled={reorderingBrands}
                        >
                          წაშლა
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="admin-empty">
                <h3>ბრენდები ჯერ არ არის დამატებული</h3>
                <p>პირველი ბრენდი მარცხენა ფორმით დაამატეთ.</p>
              </div>
            )}
          </section>
        </div>

        <div className="admin-layout">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">მანქანის დამატება</p>
                <h2>ახალი მანქანის შექმნა</h2>
              </div>
            </div>

            {brands.length > 0 ? (
              <form className="admin-form" onSubmit={handleCreateCar}>
                <label className="admin-field">
                  <span>ბრენდი</span>
                  <select
                    name="brandId"
                    value={carForm.brandId}
                    onChange={handleCarFormChange}
                    required
                  >
                    {brands.map((brand) => (
                      <option key={brand._id} value={brand._id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-field">
                  <span>მოდელი</span>
                  <input
                    name="model"
                    value={carForm.model}
                    onChange={handleCarFormChange}
                    placeholder="CLS-Class C218"
                    required
                  />
                </label>

                <label className="admin-field">
                  <span>წელი</span>
                  <input
                    name="year"
                    value={carForm.year}
                    onChange={handleCarFormChange}
                    placeholder="2015-2017"
                    required
                  />
                </label>

                <ImageUploadField
                  label="მანქანის სურათი"
                  image={carFormImage}
                  onChange={handleCarImageChange}
                  onClear={clearCarImage}
                />

                <label className="admin-field admin-field-full">
                  <span>აღწერა</span>
                  <textarea
                    name="description"
                    value={carForm.description}
                    onChange={handleCarFormChange}
                    rows="4"
                    placeholder="მანქანის მოკლე აღწერა"
                  />
                </label>

                <div className="admin-form-actions admin-field-full">
                  <button
                    className="admin-button"
                    type="submit"
                    disabled={submittingCar}
                  >
                    {submittingCar
                      ? editingCarId
                        ? "მანქანა ახლდება..."
                        : "მანქანა ემატება..."
                      : editingCarId
                        ? "მანქანის შენახვა"
                        : "მანქანის დამატება"}
                  </button>
                  {editingCarId ? (
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={handleCancelCarEdit}
                      disabled={submittingCar}
                    >
                      გაუქმება
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div className="admin-empty">
                <h3>ჯერ ბრენდი შექმენით</h3>
                <p>მანქანის დასამატებლად საჭიროა მინიმუმ ერთი ბრენდი.</p>
              </div>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">მანქანები</p>
                <h2>არსებული მანქანების მართვა</h2>
              </div>
              <span className="admin-count">სულ {cars.length}</span>
            </div>

            {carsLoading ? (
              <div className="admin-empty">
                <h3>მანქანები იტვირთება...</h3>
                <p>ადმინის გვერდი მანქანების სიას ითხოვს.</p>
              </div>
            ) : cars.length > 0 ? (
              <div className="admin-list">
                {cars.map((car) => {
                  const isSelected = car._id === selectedCarId;

                  return (
                    <article
                      key={car._id}
                      className={getDraggableItemClassName(
                        "admin-car-item",
                        "cars",
                        car._id,
                        isSelected ? "is-selected" : ""
                      )}
                      draggable={!reorderingCars}
                      onDragStart={() => handleDragStart("cars", car._id)}
                      onDragOver={(event) =>
                        handleDragOver(event, "cars", car._id)
                      }
                      onDrop={(event) => handleCarDrop(event, car._id)}
                      onDragEnd={resetDragState}
                    >
                      <div className="admin-car-summary">
                        <h3>
                          {car.brand} {car.model}
                        </h3>
                        <p>{car.year}</p>
                      </div>

                      <div className="admin-car-actions">
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() => setSelectedCarId(car._id)}
                          disabled={reorderingCars}
                        >
                          ნაწილების მართვა
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={() => handleEditCar(car)}
                          disabled={reorderingCars}
                        >
                          რედაქტირება
                        </button>
                        <button
                          type="button"
                          className="admin-button admin-button-danger"
                          onClick={() => handleDeleteCar(car)}
                          disabled={reorderingCars}
                        >
                          წაშლა
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="admin-empty">
                <h3>მანქანები ჯერ არ არის დამატებული</h3>
                <p>ბრენდის შექმნის შემდეგ დაამატეთ პირველი მანქანა.</p>
              </div>
            )}
          </section>
        </div>

        <section className="admin-panel-wide">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">ნაწილების მართვა</p>
              <h2>არჩეული მანქანის ნაწილები</h2>
            </div>
          </div>

          {selectedCar ? (
            <div className="selected-car-shell">
              <div className="selected-car-card">
                <div className="selected-car-image">
                  <img
                    src={selectedCarImage}
                    alt={`${selectedCar.brand} ${selectedCar.model}`}
                  />
                </div>

                <div className="selected-car-details">
                  <p className="eyebrow">{selectedCar.brand}</p>
                  <h3>{selectedCar.model}</h3>
                  <p>{selectedCar.year}</p>
                  <p className="selected-car-description">
                    {selectedCar.description || "აღწერა არ არის დამატებული."}
                  </p>
                </div>
              </div>

              <div className="admin-layout admin-layout-parts">
                <section className="admin-subpanel">
                  <div className="admin-panel-heading">
                    <div>
                      <p className="eyebrow">ნაწილის დამატება</p>
                      <h3>ამ მანქანისთვის ნაწილის შექმნა</h3>
                    </div>
                  </div>

                  <form className="admin-form" onSubmit={handleCreatePart}>
                    <label className="admin-field">
                      <span>ნაწილის სახელი</span>
                      <input
                        name="name"
                        value={partForm.name}
                        onChange={handlePartFormChange}
                        placeholder="წინა ბამპერი"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      <span>კოდი</span>
                      <input
                        name="code"
                        value={partForm.code}
                        onChange={handlePartFormChange}
                        placeholder="158800012"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      <span>ფასი</span>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={partForm.price}
                        onChange={handlePartFormChange}
                        placeholder="850"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      <span>კატეგორია</span>
                      <select
                        name="category"
                        value={partForm.category}
                        onChange={handlePartFormChange}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {translateCategory(category)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      <span>მდგომარეობა</span>
                      <select
                        name="condition"
                        value={partForm.condition}
                        onChange={handlePartFormChange}
                      >
                        {conditions.map((condition) => (
                          <option key={condition} value={condition}>
                            {translateCondition(condition)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <ImageUploadField
                      label="ნაწილის სურათი"
                      image={partFormImage}
                      onChange={handlePartImageChange}
                      onClear={clearPartImage}
                    />

                    <label className="admin-field admin-field-full">
                      <span>აღწერა</span>
                      <textarea
                        name="description"
                        value={partForm.description}
                        onChange={handlePartFormChange}
                        rows="4"
                        placeholder="ნაწილის მოკლე აღწერა"
                      />
                    </label>

                    <div className="admin-form-actions admin-field-full">
                      <button
                        className="admin-button"
                        type="submit"
                        disabled={submittingPart}
                      >
                        {submittingPart
                          ? editingPartId
                            ? "ნაწილი ახლდება..."
                            : "ნაწილი ემატება..."
                          : editingPartId
                            ? "ნაწილის შენახვა"
                            : "ნაწილის დამატება"}
                      </button>
                      {editingPartId ? (
                        <button
                          type="button"
                          className="admin-button admin-button-secondary"
                          onClick={handleCancelPartEdit}
                          disabled={submittingPart}
                        >
                          გაუქმება
                        </button>
                      ) : null}
                    </div>
                  </form>
                </section>

                <section className="admin-subpanel">
                  <div className="admin-panel-heading">
                    <div>
                      <p className="eyebrow">არსებული ნაწილები</p>
                      <h3>ამ მანქანისთვის შენახული ნაწილები</h3>
                    </div>
                    <span className="admin-count">სულ {parts.length}</span>
                  </div>

                  {partsLoading ? (
                    <div className="admin-empty">
                      <h3>ნაწილები იტვირთება...</h3>
                      <p>არჩეული მანქანის ნაწილები იტვირთება.</p>
                    </div>
                  ) : parts.length > 0 ? (
                    <div className="admin-list">
                      {parts.map((part) => (
                        <article
                          key={part._id}
                          className={getDraggableItemClassName(
                            "admin-part-item",
                            "parts",
                            part._id
                          )}
                          draggable={!reorderingParts}
                          onDragStart={() => handleDragStart("parts", part._id)}
                          onDragOver={(event) =>
                            handleDragOver(event, "parts", part._id)
                          }
                          onDrop={(event) => handlePartDrop(event, part._id)}
                          onDragEnd={resetDragState}
                        >
                          <div className="admin-part-summary">
                            <span className="admin-part-code">{part.code}</span>
                            <h4>{part.name}</h4>
                            <p>
                              {translateCategory(part.category)} |{" "}
                              {translateCondition(part.condition)} |{" "}
                              {Number(part.price || 0).toLocaleString("ka-GE")} ლ
                            </p>
                          </div>

                          <div className="admin-car-actions">
                            <button
                              type="button"
                              className="admin-button admin-button-secondary"
                              onClick={() => handleEditPart(part)}
                              disabled={reorderingParts}
                            >
                              რედაქტირება
                            </button>
                            <button
                              type="button"
                              className="admin-button admin-button-danger"
                              onClick={() => handleDeletePart(part)}
                              disabled={reorderingParts}
                            >
                              წაშლა
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="admin-empty">
                      <h3>ნაწილები ჯერ არ არის დამატებული</h3>
                      <p>ამ მანქანისთვის პირველი ნაწილი ზემოთ მოცემული ფორმით დაამატეთ.</p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="admin-empty">
              <h3>ჯერ შექმენით ან აირჩიეთ მანქანა</h3>
              <p>ნაწილების სამართავად ზემოდან ერთი მანქანა აირჩიეთ.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default Admin;
